import { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'

/*
  הצגת ברקוד לסריקה בקופה.
  JsBarcode מצייר את הברקוד לתוך אלמנט SVG — שוב useRef + useEffect:
  מריצים את הציור אחרי שה-SVG כבר קיים על המסך, ומחדש אם המספר משתנה.

  רקע לבן ובהירות מלאה — כדי שסורק הקופה יצליח לקרוא מהמסך.
*/
export default function BarcodeModal({ voucher, onClose }) {
  const svgRef = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    try {
      JsBarcode(svgRef.current, voucher.barcode, {
        format: 'CODE128',      // פורמט גמיש שמקבל כל מחרוזת
        displayValue: true,     // המספר מוצג מתחת לפסים
        fontSize: 18,
        height: 110,
        margin: 12,
        background: '#ffffff',
      })
    } catch {
      setFailed(true) // מספר שלא ניתן לקודד — מציגים אותו כטקסט
    }
  }, [voucher.barcode])

  return (
    // לחיצה על הרקע הכהה סוגרת; stopPropagation מונע סגירה בלחיצה על הכרטיס
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-keep-deep/90 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-xl font-bold text-ink">{voucher.business}</h2>
        {voucher.amount && (
          <p className="font-display text-3xl font-extrabold text-keep">₪{voucher.amount}</p>
        )}

        <div className="mt-4 flex justify-center" dir="ltr">
          {failed ? (
            <p className="rounded-xl bg-mist p-4 font-mono text-lg tracking-widest">
              {voucher.barcode}
            </p>
          ) : (
            <svg ref={svgRef} className="max-w-full" />
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-keep py-3 font-display font-bold text-white hover:opacity-90"
        >
          סגור
        </button>
      </div>
    </div>
  )
}
