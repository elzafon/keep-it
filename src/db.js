import { supabase } from './supabaseClient'

/*
  שכבת הנתונים — מול Supabase (Postgres + Storage).
  ------------------------------------------------------------
  שמות הפונקציות זהים לגרסת Dexie, כדי שהקומפוננטות לא ישתנו כמעט בכלל.
  מיפוי שמות: JS camelCase (notifiedOn) ↔ Postgres snake_case (notified_on).

  תמונות: הבינארי (Blob) לא נשמר בטבלה אלא ב-Supabase Storage (bucket פרטי).
  בטבלה נשמר רק image_path. בקריאה מורידים את ה-Blob ומחזירים אותו בשדה
  voucher.image — כך הקומפוננטות (שמצפות ל-Blob) לא משתנות.
*/

const TABLE = 'vouchers'
const BUCKET = 'voucher-images'

// מטמון תמונות לפי נתיב — כדי לא להוריד שוב בכל ריענון Realtime
const imageCache = new Map()

// שורה מ-Supabase (snake_case) → אובייקט שובר ב-JS (camelCase)
function fromRow(row) {
  return {
    id: row.id,
    business: row.business,
    source: row.source,
    type: row.type,
    amount: row.amount,
    benefit: row.benefit,
    barcode: row.barcode,
    cvv: row.cvv,
    expiry: row.expiry,
    notes: row.notes,
    redeemed: row.redeemed ? 1 : 0, // הקומפוננטות משתמשות ב-0/1
    notifiedOn: row.notified_on,
    createdAt: row.created_at,
    imagePath: row.image_path, // נתיב ב-Storage (לא הבינארי עצמו)
    image: null, // ה-Blob יטען בנפרד ב-fetchVouchers
  }
}

// אובייקט טופס → עמודות טקסט ל-Supabase. image/imagePath מטופלים בנפרד.
function toRow(v) {
  return {
    business: v.business,
    source: v.source || null,
    type: v.type || null,
    amount: v.amount ?? null,
    benefit: v.benefit || null,
    barcode: v.barcode || null,
    cvv: v.cvv || null,
    expiry: v.expiry || null,
    notes: v.notes || null,
  }
}

// הורדת Blob מ-Storage (עם מטמון)
async function loadImage(path) {
  if (!path) return null
  if (imageCache.has(path)) return imageCache.get(path)
  const { data, error } = await supabase.storage.from(BUCKET).download(path)
  if (error) {
    console.warn('[KeepIt] הורדת תמונה נכשלה:', path, error.message)
    return null
  }
  imageCache.set(path, data)
  return data
}

// מחזיר את image_path לשמירה: נתיב קיים אם לא השתנה, או העלאה של קובץ חדש
async function resolveImagePath(v) {
  if (v.imagePath) return v.imagePath // תמונה קיימת שלא שונתה
  if (v.image) {
    const path = crypto.randomUUID()
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, v.image, { contentType: v.image.type || 'image/jpeg' })
    if (error) throw error
    imageCache.set(path, v.image)
    return path
  }
  return null // אין תמונה (או שהוסרה)
}

/** שליפת כל השוברים + הורדת התמונות שלהם */
export async function fetchVouchers() {
  const { data, error } = await supabase.from(TABLE).select('*')
  if (error) throw error
  const vouchers = data.map(fromRow)
  await Promise.all(
    vouchers.map(async (v) => {
      v.image = await loadImage(v.imagePath)
    }),
  )
  return vouchers
}

/** הוספת שובר חדש */
export async function addVoucher(voucher) {
  const image_path = await resolveImagePath(voucher)
  const { error } = await supabase.from(TABLE).insert({ ...toRow(voucher), image_path })
  if (error) throw error
}

/** הוספת כמה שוברים בבת אחת — לזרימת ההדבקה מ-SMS (בלי תמונות) */
export async function bulkAddVouchers(list) {
  const { error } = await supabase.from(TABLE).insert(list.map(toRow))
  if (error) throw error
}

/** עדכון שדות שובר קיים (עריכה מהטופס) */
export async function updateVoucher(id, changes) {
  const image_path = await resolveImagePath(changes)
  const { error } = await supabase
    .from(TABLE)
    .update({ ...toRow(changes), image_path })
    .eq('id', id)
  if (error) throw error
}

/** מחיקת שובר */
export async function deleteVoucher(id) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
}

/** סימון שובר כמומש (או ביטול) */
export async function toggleRedeemed(voucher) {
  const { error } = await supabase
    .from(TABLE)
    .update({ redeemed: !voucher.redeemed })
    .eq('id', voucher.id)
  if (error) throw error
}

/** סימון שכבר נשלחה התראת תוקף היום — מונע התראות כפולות */
export async function markNotified(id, dateKey) {
  const { error } = await supabase.from(TABLE).update({ notified_on: dateKey }).eq('id', id)
  if (error) throw error
}

/** שוברים לדוגמה — כדי לראות את הדשבורד חי בלי להקליד */
export async function seedDemoData() {
  const day = 24 * 60 * 60 * 1000
  const inDays = (n) => new Date(Date.now() + n * day).toISOString().slice(0, 10)

  const { error } = await supabase.from(TABLE).insert([
    { business: 'BuyMe', type: 'גיפט קארד', amount: 200, barcode: '7290012345678', expiry: inDays(180), notes: 'מתנה מהעבודה' },
    { business: 'שופרסל', type: 'תו קנייה', amount: 150, barcode: '7290098765432', expiry: inDays(9) },
    { business: 'סופר-פארם', type: 'קופון', amount: 50, barcode: '7290011122233', expiry: inDays(-3), benefit: '30% על מוצרי טיפוח' },
    { business: 'רולדין', type: 'שובר', amount: 100, barcode: '7290044455566', expiry: inDays(45), redeemed: true },
  ])
  if (error) throw error
}
