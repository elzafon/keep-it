/*
  לוגיקת תוקף — פונקציות טהורות (בלי React)
  קל לבדוק אותן, וקל לעשות בהן שימוש חוזר בכל קומפוננטה.
*/

/** כמה ימים נשארו עד התוקף (שלילי = פג) */
export function daysLeft(expiry) {
  if (!expiry) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(expiry)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (24 * 60 * 60 * 1000))
}

/** סטטוס תוקף: expired / soon / ok / none */
export function expiryStatus(expiry) {
  const d = daysLeft(expiry)
  if (d === null) return 'none'
  if (d < 0) return 'expired'
  if (d <= 14) return 'soon'
  return 'ok'
}

/** טקסט ידידותי בעברית */
export function expiryLabel(expiry) {
  const d = daysLeft(expiry)
  if (d === null) return 'ללא תוקף'
  if (d < -1) return `פג לפני ${-d} ימים`
  if (d === -1) return 'פג אתמול'
  if (d === 0) return 'פג היום!'
  if (d === 1) return 'פג מחר'
  if (d <= 30) return `עוד ${d} ימים`
  return new Date(expiry).toLocaleDateString('he-IL')
}
