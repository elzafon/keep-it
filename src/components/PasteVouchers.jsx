import { useState } from 'react'
import { parseVouchers } from '../utils/parseVouchers'
import { bulkAddVouchers } from '../db'

/*
  הדבקת קופונים מהודעת SMS
  -------------------------
  זרימה בשני שלבים:
    1. הדבקת טקסט → לחיצה על "נתח" מפעילה את הפרסר הטהור.
    2. תצוגה מקדימה נערכת — כל קופון בשורה משלו, ניתן לתקן כל שדה
       או להסיר קופון, ואז לשמור את כולם בבת אחת.

  מושגי React כאן:
  - "preview state": מחזיקים את תוצאת הניתוח ב-state (rows) ומאפשרים
    לערוך אותה לפני שמירה — commit קורה רק בלחיצה על "שמור".
  - עדכון פריט בודד במערך: map שמחליף רק את השורה בעלת ה-index הנכון,
    בלי לשנות (mutate) את המערך הקיים — React מזהה שינוי לפי הפניה חדשה.
*/
export default function PasteVouchers({ onClose }) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState(null) // null = עוד לא נותח; מערך = תוצאת הניתוח
  const [error, setError] = useState('')

  function handleParse() {
    const parsed = parseVouchers(text)
    if (parsed.length === 0) {
      setError('לא זוהו קופונים בהודעה. בדוק/י שהעתקת את כל הטקסט.')
      return
    }
    setError('')
    setRows(parsed)
  }

  // עדכון שדה בשורה בודדת — עריכה מלאה של כל קופון
  function updateRow(index, field, value) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSaveAll() {
    const payload = rows.map((row) => ({
      ...row,
      business: row.business.trim(),
      amount: row.amount ? Number(row.amount) : null,
    }))
    await bulkAddVouchers(payload)
    onClose() // חוזרים לדשבורד — הרשימה תתעדכן לבד
  }

  const field =
    'w-full rounded-xl border border-ink/10 bg-card px-3 py-2 focus:outline-2 focus:outline-keep'
  const miniLabel = 'mb-1 block text-xs font-semibold text-faint'

  // ---- שלב 1: הדבקת הטקסט ----
  if (rows === null) {
    return (
      <div className="mx-auto max-w-md">
        <h2 className="font-display text-2xl font-bold">הדבקה מ-SMS</h2>
        <p className="mb-6 text-faint">הדביקו את הודעת הקופונים — נזהה את הפרטים אוטומטית</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="הדביקו כאן את כל תוכן ההודעה..."
          className={`${field} resize-y`}
          autoFocus
        />

        {error && <p className="mt-2 font-semibold text-danger">{error}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleParse}
            disabled={!text.trim()}
            className="flex-1 rounded-xl bg-keep py-3 font-display font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            נתח קופונים
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-3 font-semibold text-faint hover:text-ink"
          >
            ביטול
          </button>
        </div>
      </div>
    )
  }

  // ---- שלב 2: תצוגה מקדימה נערכת ----
  return (
    <div className="mx-auto max-w-md">
      <h2 className="font-display text-2xl font-bold">זוהו {rows.length} קופונים</h2>
      <p className="mb-6 text-faint">בדקו, תקנו במידת הצורך, ושמרו</p>

      <div className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <div key={i} className="rounded-2xl border border-ink/10 bg-mist/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold">קופון {i + 1}</span>
              <button
                onClick={() => removeRow(i)}
                className="text-xs font-semibold text-faint hover:text-danger"
              >
                הסר
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="col-span-2">
                <span className={miniLabel}>בית עסק</span>
                <input
                  value={row.business}
                  onChange={(e) => updateRow(i, 'business', e.target.value)}
                  className={field}
                />
              </label>
              <label>
                <span className={miniLabel}>מקור / מנפיק</span>
                <input
                  value={row.source}
                  onChange={(e) => updateRow(i, 'source', e.target.value)}
                  className={field}
                />
              </label>
              <label>
                <span className={miniLabel}>סוג</span>
                <select
                  value={row.type}
                  onChange={(e) => updateRow(i, 'type', e.target.value)}
                  className={field}
                >
                  <option>גיפט קארד</option>
                  <option>תו קנייה</option>
                  <option>קופון</option>
                  <option>שובר</option>
                </select>
              </label>
              <label>
                <span className={miniLabel}>מספר ברקוד</span>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  value={row.barcode}
                  onChange={(e) => updateRow(i, 'barcode', e.target.value)}
                  className={`${field} font-mono`}
                />
              </label>
              <label>
                <span className={miniLabel}>קוד אימות (CVV)</span>
                <input
                  dir="ltr"
                  inputMode="numeric"
                  value={row.cvv}
                  onChange={(e) => updateRow(i, 'cvv', e.target.value)}
                  className={`${field} font-mono`}
                />
              </label>
              <label>
                <span className={miniLabel}>סכום (₪)</span>
                <input
                  type="number"
                  min="0"
                  value={row.amount ?? ''}
                  onChange={(e) => updateRow(i, 'amount', e.target.value)}
                  className={field}
                />
              </label>
              <label>
                <span className={miniLabel}>בתוקף עד</span>
                <input
                  type="date"
                  value={row.expiry}
                  onChange={(e) => updateRow(i, 'expiry', e.target.value)}
                  className={field}
                />
              </label>
              <label className="col-span-2">
                <span className={miniLabel}>הטבה / מה מקבלים</span>
                <input
                  value={row.benefit}
                  onChange={(e) => updateRow(i, 'benefit', e.target.value)}
                  className={field}
                />
              </label>
              <label className="col-span-2">
                <span className={miniLabel}>הערות</span>
                <input
                  value={row.notes}
                  onChange={(e) => updateRow(i, 'notes', e.target.value)}
                  className={field}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={handleSaveAll}
          disabled={rows.length === 0}
          className="flex-1 rounded-xl bg-keep py-3 font-display font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          שמור {rows.length} קופונים
        </button>
        <button
          onClick={() => setRows(null)}
          className="rounded-xl px-5 py-3 font-semibold text-faint hover:text-ink"
        >
          חזור לטקסט
        </button>
      </div>
    </div>
  )
}
