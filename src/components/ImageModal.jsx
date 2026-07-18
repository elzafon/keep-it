/*
  הצגת התמונה המצורפת לשובר במסך מלא.
  אותו דפוס כמו BarcodeModal: לחיצה על הרקע הכהה סוגרת,
  ו-stopPropagation על התמונה עצמה מונע סגירה בלחיצה עליה.

  ה-url מגיע מוכן מ-VoucherCard (object URL של ה-Blob) — כדי לא ליצור
  אותו פעמיים ולשמור על ניהול/שחרור במקום אחד.
*/
export default function ImageModal({ url, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-keep-deep/90 p-6"
      onClick={onClose}
    >
      <img
        src={url}
        alt="תמונת השובר"
        className="max-h-full max-w-full rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg px-3 py-1 font-semibold text-white hover:bg-white/10"
      >
        ✕ סגור
      </button>
    </div>
  )
}
