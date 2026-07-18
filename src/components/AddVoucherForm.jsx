import { useState, useEffect, lazy, Suspense } from 'react'
import { addVoucher, updateVoucher } from '../db'

/*
  טעינה עצלה (code splitting): ספריית הסריקה שוקלת ~0.5MB,
  אז במקום לייבא אותה רגיל — lazy() מפצל אותה לקובץ נפרד
  שהדפדפן מוריד רק כשלוחצים "סרוק" בפעם הראשונה.
*/
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

/*
  טופס הוספה *ועריכה* בקומפוננטה אחת — דוגמה קלאסית ל"controlled inputs":
  כל שדה בטופס מחובר ל-state, ו-React הוא מקור האמת היחיד לערך שלו.

  voucher (אופציונלי) קובע אם זו עריכה: אם הועבר — הטופס מתמלא מהשובר
  הקיים ושמירה מעדכנת אותו; אחרת זו הוספה חדשה.
  onClose הוא prop מסוג פונקציה — ככה קומפוננטת-ילד "מדברת" עם ההורה.
*/
export default function AddVoucherForm({ onClose, voucher = null }) {
  const isEdit = Boolean(voucher)

  // Lazy initializer: הפונקציה רצה פעם אחת בלבד ברינדור הראשון.
  // חשוב בעיקר בעריכה — כדי לא לבנות את אובייקט ההתחלה מחדש בכל הקלדה.
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          business: voucher.business ?? '',
          source: voucher.source ?? '',
          type: voucher.type ?? 'גיפט קארד',
          amount: voucher.amount ?? '',
          benefit: voucher.benefit ?? '',
          barcode: voucher.barcode ?? '',
          cvv: voucher.cvv ?? '',
          expiry: voucher.expiry ?? '',
          notes: voucher.notes ?? '',
          image: voucher.image ?? null,
        }
      : {
          business: '',
          source: '',
          type: 'גיפט קארד',
          amount: '',
          benefit: '',
          barcode: '',
          cvv: '',
          expiry: '',
          notes: '',
          image: null,
        },
  )
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)
  const [scanMsg, setScanMsg] = useState('')

  // תצוגה מקדימה של התמונה: יוצרים object URL מה-Blob ומשחררים אותו בניקוי.
  // בלי ה-revoke נדלוף זיכרון — בדיוק כמו ה-cleanup החשוב בסורק הברקוד.
  useEffect(() => {
    if (!form.image) {
      setImageUrl(null)
      return
    }
    const url = URL.createObjectURL(form.image)
    setImageUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [form.image])

  // פונקציית עדכון אחת לכל השדות: לפי ה-name של ה-input
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // קלט קובץ מחזיר File (שהוא תת-סוג של Blob) — שומרים אותו כמו שהוא ב-state
  function handleImageChange(e) {
    const file = e.target.files?.[0] ?? null
    setForm((prev) => ({ ...prev, image: file }))
    setScanMsg('')
  }

  function removeImage() {
    setForm((prev) => ({ ...prev, image: null }))
    setScanMsg('')
  }

  // שליפת קוד QR/ברקוד מהתמונה המצורפת — מנצל את מנוע @zxing (כמו הסורק),
  // אבל מפענח מתמונה סטטית במקום ממצלמה. import דינמי כדי לא לנפח את הבאנדל.
  async function scanFromImage() {
    if (!form.image) return
    setScanMsg('סורק...')
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const url = URL.createObjectURL(form.image)
      try {
        const result = await reader.decodeFromImageUrl(url)
        setForm((prev) => ({ ...prev, barcode: result.getText() }))
        setScanMsg('✓ הקוד נשלף מהתמונה')
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch {
      setScanMsg('לא זוהה קוד בתמונה — נסה תמונה ברורה יותר או הקלד ידנית')
    }
  }

  async function handleSave() {
    if (!form.business.trim()) {
      setError('חסר שם של בית העסק')
      return
    }
    const payload = {
      ...form,
      business: form.business.trim(),
      amount: form.amount ? Number(form.amount) : null,
    }
    if (isEdit) {
      await updateVoucher(voucher.id, payload)
    } else {
      await addVoucher(payload)
    }
    onClose() // חוזרים לדשבורד — הרשימה תתעדכן לבד
  }

  const field =
    'w-full rounded-xl border border-ink/10 bg-card px-3 py-2 focus:outline-2 focus:outline-keep'

  return (
    <div className="mx-auto max-w-md">
      <h2 className="font-display text-2xl font-bold">{isEdit ? 'עריכת שובר' : 'שובר חדש'}</h2>
      <p className="mb-6 text-faint">
        {isEdit ? 'עדכן את הפרטים ושמור' : 'מלא ידנית או סרוק את הברקוד במצלמה'}
      </p>

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

        <label>
          <span className="mb-1 block font-semibold">מקור / מנפיק</span>
          <input
            name="source"
            value={form.source}
            onChange={handleChange}
            placeholder="למשל: מפעל הפיס (אופציונלי)"
            className={field}
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
          <span className="mb-1 block font-semibold">הטבה / מה מקבלים</span>
          <input
            name="benefit"
            value={form.benefit}
            onChange={handleChange}
            placeholder="למשל: 10% הנחה, משקה גודל S"
            className={field}
          />
        </label>

        <label>
          <span className="mb-1 block font-semibold">מספר ברקוד</span>
          <div className="flex gap-2">
            <input
              name="barcode"
              inputMode="numeric"
              dir="ltr"
              value={form.barcode}
              onChange={handleChange}
              placeholder="הקלד או סרוק"
              className={`${field} font-mono`}
            />
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="shrink-0 rounded-xl bg-keep-deep px-4 font-semibold text-white hover:opacity-90"
            >
              📷 סרוק
            </button>
          </div>
        </label>

        <label>
          <span className="mb-1 block font-semibold">קוד אימות (CVV)</span>
          <input
            name="cvv"
            inputMode="numeric"
            dir="ltr"
            value={form.cvv}
            onChange={handleChange}
            placeholder="אופציונלי"
            className={`${field} font-mono`}
          />
        </label>

        {/* הסורק מוצג רק כש-scanning פעיל — רינדור מותנה */}
        {scanning && (
          // Suspense מציג fallback בזמן שהקובץ של הסורק יורד
          <Suspense
            fallback={
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-keep-deep font-semibold text-white">
                טוען סורק...
              </div>
            }
          >
            <BarcodeScanner
              onDetected={(code) => {
                setForm((prev) => ({ ...prev, barcode: code }))
                setScanning(false)
              }}
              onClose={() => setScanning(false)}
            />
          </Suspense>
        )}

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

        <div>
          <span className="mb-1 block font-semibold">תמונה מצורפת</span>
          {imageUrl ? (
            <div className="flex flex-col gap-2">
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="תצוגה מקדימה של התמונה"
                  className="max-h-48 rounded-xl border border-ink/10"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute left-2 top-2 rounded-full bg-danger px-2 py-0.5 text-sm font-bold text-white hover:opacity-90"
                >
                  ✕ הסר
                </button>
              </div>
              <button
                type="button"
                onClick={scanFromImage}
                className="self-start rounded-xl bg-keep-deep px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                🔍 שלוף קוד מהתמונה
              </button>
              {scanMsg && <p className="text-sm text-faint">{scanMsg}</p>}
            </div>
          ) : (
            <label
              className={`${field} flex cursor-pointer items-center justify-center gap-2 text-faint hover:text-ink`}
            >
              📎 בחר תמונה או צלם
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>

        {error && <p className="font-semibold text-danger">{error}</p>}

        <div className="mt-2 flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 rounded-xl bg-keep py-3 font-display font-bold text-white hover:opacity-90"
          >
            {isEdit ? 'שמור שינויים' : 'שמור שובר'}
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
