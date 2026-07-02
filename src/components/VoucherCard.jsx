import { useState } from 'react'
import { toggleRedeemed, deleteVoucher } from '../db'
import { expiryStatus, expiryLabel } from '../utils/expiry'
import BarcodeModal from './BarcodeModal'

/*
  כרטיס שובר בודד.
  props = הנתונים שהקומפוננטה מקבלת מבחוץ (כאן: אובייקט voucher).
  הקומפוננטה רק *מציגה* — את שינוי הנתונים עושות הפונקציות מ-db.js,
  וה-UI מתעדכן אוטומטית בזכות useLiveQuery שברשימה.
*/

const statusStyles = {
  expired: 'bg-danger/10 text-danger',
  soon: 'bg-amber/15 text-amber',
  ok: 'bg-keep/10 text-keep',
  none: 'bg-faint/10 text-faint',
}

export default function VoucherCard({ voucher }) {
  const status = expiryStatus(voucher.expiry)
  const isRedeemed = Boolean(voucher.redeemed)
  const [showBarcode, setShowBarcode] = useState(false)

  return (
    <article
      className={`ticket flex rounded-2xl bg-card shadow-sm transition-opacity ${
        isRedeemed ? 'opacity-50' : ''
      }`}
    >
      {/* גוף הכרטיס */}
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold">{voucher.business}</h3>
            <p className="text-sm text-faint">{voucher.type}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[status]}`}
          >
            {isRedeemed ? 'מומש' : expiryLabel(voucher.expiry)}
          </span>
        </div>

        {voucher.barcode && (
          <button
            onClick={() => setShowBarcode(true)}
            className="mt-2 flex items-center gap-2 rounded-lg bg-mist px-2 py-1 text-xs font-semibold text-ink hover:bg-keep/10"
          >
            <span aria-hidden>▮▯▮</span>
            הצג ברקוד לסריקה
          </button>
        )}

        {showBarcode && (
          <BarcodeModal voucher={voucher} onClose={() => setShowBarcode(false)} />
        )}
        {voucher.notes && <p className="mt-1 text-sm">{voucher.notes}</p>}
      </div>

      {/* הספח — סכום ופעולות, מופרד בקו ניקוב */}
      <div className="perforation flex w-28 flex-col items-center justify-center gap-2 p-3">
        {voucher.amount ? (
          <div className="font-display text-2xl font-extrabold text-keep">
            ₪{voucher.amount}
          </div>
        ) : (
          <div className="text-sm text-faint">—</div>
        )}
        <button
          onClick={() => toggleRedeemed(voucher)}
          className="w-full rounded-lg bg-keep px-2 py-1 text-sm font-semibold text-white hover:opacity-90"
        >
          {isRedeemed ? 'החזר לפעיל' : 'סמן כמומש'}
        </button>
        <button
          onClick={() => {
            if (confirm(`למחוק את השובר של ${voucher.business}?`)) {
              deleteVoucher(voucher.id)
            }
          }}
          className="text-xs text-faint hover:text-danger"
        >
          מחק
        </button>
      </div>
    </article>
  )
}
