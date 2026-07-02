import { useState } from 'react'
import { addVoucher } from '../db'

/*
  טופס הוספת שובר — דוגמה קלאסית ל"controlled inputs":
  כל שדה בטופס מחובר ל-state, ו-React הוא מקור האמת היחיד לערך שלו.

  onClose הוא prop מסוג פונקציה — ככה קומפוננטת-ילד "מדברת" עם ההורה.
*/
export default function AddVoucherForm({ onClose }) {
  // אובייקט state אחד לכל הטופס במקום useState לכל שדה
  const [form, setForm] = useState({
    business: '',
    type: 'גיפט קארד',
    amount: '',
    barcode: '',
    expiry: '',
    notes: '',
  })
  const [error, setError] = useState('')

  // פונקציית עדכון אחת לכל השדות: לפי ה-name של ה-input
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    if (!form.business.trim()) {
      setError('חסר שם של בית העסק')
      return
    }
    await addVoucher({
      ...form,
      business: form.business.trim(),
      amount: form.amount ? Number(form.amount) : null,
    })
    onClose() // חוזרים לדשבורד — הרשימה תתעדכן לבד
  }

  const field =
    'w-full rounded-xl border border-ink/10 bg-card px-3 py-2 focus:outline-2 focus:outline-keep'

  return (
    <div className="mx-auto max-w-md">
      <h2 className="font-display text-2xl font-bold">שובר חדש</h2>
      <p className="mb-6 text-faint">בשלב הבא נוסיף סריקת ברקוד במצלמה 📷</p>

      <div className="flex flex-col gap-4">
        <label>
          <span className="mb-1 block font-semibold">בית עסק *</span>
          <input
            name="business"
            value={form.business}
            onChange={handleChange}
            placeholder="למשל: BuyMe, שופרסל..."
            className={field}
            autoFocus
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label>
            <span className="mb-1 block font-semibold">סוג</span>
            <select name="type" value={form.type} onChange={handleChange} className={field}>
              <option>גיפט קארד</option>
              <option>תו קנייה</option>
              <option>קופון</option>
              <option>שובר</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block font-semibold">סכום (₪)</span>
            <input
              name="amount"
              type="number"
              min="0"
              value={form.amount}
              onChange={handleChange}
              className={field}
            />
          </label>
        </div>

        <label>
          <span className="mb-1 block font-semibold">מספר ברקוד</span>
          <input
            name="barcode"
            inputMode="numeric"
            dir="ltr"
            value={form.barcode}
            onChange={handleChange}
            className={`${field} font-mono`}
          />
        </label>

        <label>
          <span className="mb-1 block font-semibold">בתוקף עד</span>
          <input
            name="expiry"
            type="date"
            value={form.expiry}
            onChange={handleChange}
            className={field}
          />
        </label>

        <label>
          <span className="mb-1 block font-semibold">הערות</span>
          <input
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="אופציונלי"
            className={field}
          />
        </label>

        {error && <p className="font-semibold text-danger">{error}</p>}

        <div className="mt-2 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-keep py-3 font-display font-bold text-white hover:opacity-90"
          >
            שמור שובר
          </button>
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-3 font-semibold text-faint hover:text-ink"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
