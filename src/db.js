import Dexie from 'dexie'

/*
  שכבת הנתונים — IndexedDB דרך Dexie
  ------------------------------------
  IndexedDB הוא מסד נתונים שמובנה בתוך הדפדפן.
  הנתונים נשמרים על המכשיר שלך בלבד — אין שרת, אין חשבון.

  Dexie היא ספרייה שעוטפת אותו ב-API נעים.
*/
export const db = new Dexie('keepit')

// גרסה 1 של הסכמה: טבלת vouchers.
// המחרוזת מגדירה רק את השדות שרוצים *לחפש/למיין* לפיהם —
// שאר השדות (notes, barcode...) נשמרים חופשי על כל רשומה.
db.version(1).stores({
  vouchers: '++id, business, expiry, redeemed',
})

/** הוספת שובר חדש */
export function addVoucher(voucher) {
  return db.vouchers.add({
    ...voucher,
    redeemed: 0,               // 0 = פעיל, 1 = מומש
    createdAt: new Date().toISOString(),
  })
}

/** סימון שובר כמומש (או ביטול הסימון) */
export function toggleRedeemed(voucher) {
  return db.vouchers.update(voucher.id, { redeemed: voucher.redeemed ? 0 : 1 })
}

/** מחיקת שובר */
export function deleteVoucher(id) {
  return db.vouchers.delete(id)
}

/** שוברים לדוגמה — כדי לראות את הדשבורד חי בלי להקליד */
export function seedDemoData() {
  const day = 24 * 60 * 60 * 1000
  const inDays = (n) => new Date(Date.now() + n * day).toISOString().slice(0, 10)

  return db.vouchers.bulkAdd([
    { business: 'BuyMe', type: 'גיפט קארד', amount: 200, barcode: '7290012345678', expiry: inDays(180), notes: 'מתנה מהעבודה', redeemed: 0, createdAt: new Date().toISOString() },
    { business: 'שופרסל', type: 'תו קנייה', amount: 150, barcode: '7290098765432', expiry: inDays(9), notes: '', redeemed: 0, createdAt: new Date().toISOString() },
    { business: 'סופר-פארם', type: 'קופון', amount: 50, barcode: '7290011122233', expiry: inDays(-3), notes: '30% על מוצרי טיפוח', redeemed: 0, createdAt: new Date().toISOString() },
    { business: 'רולדין', type: 'שובר', amount: 100, barcode: '7290044455566', expiry: inDays(45), notes: '', redeemed: 1, createdAt: new Date().toISOString() },
  ])
}
