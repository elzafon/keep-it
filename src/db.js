import { supabase } from './supabaseClient'

/*
  שכבת הנתונים — עכשיו מול Supabase (Postgres) במקום IndexedDB.
  ------------------------------------------------------------
  שמות הפונקציות זהים לגרסת Dexie הקודמת, כדי שהקומפוננטות
  (AddVoucherForm, VoucherCard, PasteVouchers, App) לא ישתנו כמעט בכלל.

  מיפוי שמות: ב-JS השדות camelCase (notifiedOn), ב-Postgres snake_case
  (notified_on). הפונקציות fromRow/toRow עושות את ההמרה בשני הכיוונים.

  הערה: שדה התמונה (image, Blob) עדיין לא נשמר כאן — הוא יעבור ל-Supabase
  Storage בשלב נפרד. עד אז הוא פשוט לא מסונכרן לשרת.
*/

const TABLE = 'vouchers'

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
  }
}

// אובייקט טופס → שורה ל-Supabase. משמיטים image (Storage בהמשך).
// ריק ('') הופך ל-null כדי לא לשבור עמודות date/numeric.
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

/** שליפת כל השוברים (RLS מחזיר רק את מה שמותר למשתמש המחובר) */
export async function fetchVouchers() {
  const { data, error } = await supabase.from(TABLE).select('*')
  if (error) throw error
  return data.map(fromRow)
}

/** הוספת שובר חדש */
export async function addVoucher(voucher) {
  const { error } = await supabase.from(TABLE).insert(toRow(voucher))
  if (error) throw error
}

/** הוספת כמה שוברים בבת אחת — לזרימת ההדבקה מ-SMS */
export async function bulkAddVouchers(list) {
  const { error } = await supabase.from(TABLE).insert(list.map(toRow))
  if (error) throw error
}

/** עדכון שדות שובר קיים (עריכה מהטופס) */
export async function updateVoucher(id, changes) {
  const { error } = await supabase.from(TABLE).update(toRow(changes)).eq('id', id)
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
