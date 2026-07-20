import { useState, useEffect, lazy, Suspense } from 'react'
import { addVoucher, updateVoucher } from '../db'

/*
  טעינה עצלה (code splitting): ספריית הסריקה שוקלת ~0.5MB,
  אז במקום לייבא אותה רגיל — lazy() מפצל אותה לקובץ נפרד
  שהדפדפן מוריד רק כשלוחצים "סרוק" בפעם הראשונה.
*/
const BarcodeScanner = lazy(() => import('./BarcodeScanner'))

// טוען כתובת תמונה לאלמנט <img> ומחזיר Promise שנפתר כשהתמונה מוכנה לציור על canvas
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// מנסה לפענח ברקוד מאזור מלבני בתמונה, כשהוא מצויר (ואולי מוגדל) על canvas.
// הגדלת אזור קטן נותנת ל-zxing יותר פיקסלים לעבוד איתם. מחזיר טקסט או null.
function tryDecodeRegion(reader, img, sx, sy, sw, sh) {
  const canvas = document.createElement('canvas')
  const scale = Math.min(3, Math.max(1, 1400 / sw))
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  try {
    return reader.decodeFromCanvas(canvas).getText()
  } catch {
    return null // decodeFromCanvas זורק כשלא נמצא קוד — לא שגיאה אמיתית
  }
}

// אסטרטגיית זיהוי: קודם כל התמונה, ואם נכשל — פריסה לאריחים חופפים ומוגדלים.
// ככה מוצאים ברקוד קטן שיושב באזור כלשהו בתוך צילום מלא.
async function decodeBarcodeFromImage(reader, url) {
  const img = await loadImage(url)
  const W = img.naturalWidth
  const H = img.naturalHeight

  const full = tryDecodeRegion(reader, img, 0, 0, W, H)
  if (full) return full

  const cols = 2
  const rows = 3
  const overlap = 0.2 // חפיפה בין אריחים כדי לא לחתוך ברקוד שנופל על גבול
  const tileW = W / cols
  const tileH = H / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = Math.max(0, tileW * c - tileW * overlap)
      const sy = Math.max(0, tileH * r - tileH * overlap)
      const sw = Math.min(W - sx, tileW * (1 + 2 * overlap))
      const sh = Math.min(H - sy, tileH * (1 + 2 * overlap))
      const text = tryDecodeRegion(reader, img, sx, sy, sw, sh)
      if (text) return text
    }
  }
  return null
}

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
          imagePath: voucher.imagePath ?? null,
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
          imagePath: null,
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
    // imagePath: null → מסמן שזו תמונה חדשה שצריך להעלות (לא הקיימת)
    setForm((prev) => ({ ...prev, image: file, imagePath: null }))
    setScanMsg('')
  }

  function removeImage() {
    setForm((prev) => ({ ...prev, image: null, imagePath: null }))
    setScanMsg('')
  }

  // שליפת קוד QR/ברקוד מהתמונה המצורפת — מנצל את מנוע @zxing (כמו הסורק),
  // אבל מפענח מתמונה סטטית במקום ממצלמה. import דינמי כדי לא לנפח את הבאנדל.
  async function scanFromImage() {
    if (!form.image) return
    setScanMsg('סורק...')
    try {
      // @zxing/library הוא dependency של @zxing/browser (משם מגיע DecodeHintType)
      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ])
      // TRY_HARDER = מאמץ זיהוי גדול יותר (חשוב לקוד קטן/מעוצב בתוך צילום מלא)
      const hints = new Map()
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.ITF,
      ])
      const reader = new BrowserMultiFormatReader(hints)
      const url = URL.createObjectURL(form.image)
      try {
        // בצילום מלא (למשל צילום מסך של תלוש) הברקוד תופס אזור קטן,
        // ו-zxing על כל התמונה בבת-אחת לרוב לא מוצא אותו. לכן מנסים קודם
        // את כל התמונה, ואם נכשל — סורקים אריחים חופפים ומוגדלים.
        const text = await decodeBarcodeFromImage(reader, url)
        if (text) {
          setForm((prev) => ({ ...prev, barcode: text }))
          setScanMsg('✓ הקוד נשלף מהתמונה')
        } else {
          setScanMsg('לא זוהה קוד בתמונה — נסה לחתוך את הצילום לאזור הקוד/QR, או הקלד ידנית')
        }
      } finally {
        URL.revokeObjectURL(url)
      }
    } catch {
      setScanMsg('לא זוהה קוד בתמונה — נסה לחתוך את הצילום לאזור הקוד/QR, או הקלד ידנית')
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
    try {
      if (isEdit) {
        await updateVoucher(voucher.id, payload)
      } else {
        await addVoucher(payload)
      }
      onClose() // חוזרים לדשבורד — הרשימה תתעדכן לבד
    } catch (err) {
      setError('שמירה נכשלה: ' + (err?.message || String(err)))
    }
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
