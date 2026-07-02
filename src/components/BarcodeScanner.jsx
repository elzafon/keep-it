import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

/*
  סורק ברקוד במצלמה — הקומפוננטה הכי "מתקדמת" בפרויקט עד עכשיו.

  שני hooks חדשים כאן:

  useRef   — "ידית אחיזה" לאלמנט DOM אמיתי. ספריית ZXing צריכה גישה
             ישירה לתגית <video>, ו-ref הוא הדרך של React לתת אותה.

  useEffect — קוד שרץ *אחרי* שהקומפוננטה מופיעה על המסך (הפעלת מצלמה),
             והפונקציה שמוחזרת ממנו רצה כשהיא מוסרת (כיבוי מצלמה).
             בלי ה-cleanup הזה — המצלמה תישאר דולקת ברקע!

  שים לב: דפדפנים מרשים גישה למצלמה רק ב-HTTPS או ב-localhost.
*/
export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()
    let controls = null
    let done = false

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, _err, ctrl) => {
        // ה-callback רץ על כל פריים; result מגיע רק כשזוהה ברקוד
        if (result && !done) {
          done = true
          ctrl.stop()
          onDetected(result.getText())
        }
      })
      .then((ctrl) => {
        controls = ctrl
      })
      .catch(() => {
        setError('אין גישה למצלמה. ודא שאישרת הרשאה, ושהאתר רץ על localhost או HTTPS.')
      })

    // cleanup: רץ כשסוגרים את הסורק
    return () => controls?.stop()
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-keep-deep">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="font-display text-lg font-bold">סריקת ברקוד</h2>
        <button onClick={onClose} className="rounded-lg px-3 py-1 font-semibold hover:bg-white/10">
          ✕ סגור
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" />

        {/* מסגרת כיוון — עיצוב בלבד, הסריקה עובדת על כל התמונה */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-72 rounded-2xl border-4 border-amber shadow-[0_0_0_9999px_rgba(18,51,46,0.55)]" />
        </div>

        {error && (
          <p className="absolute bottom-8 mx-6 rounded-xl bg-danger p-4 text-center font-semibold text-white">
            {error}
          </p>
        )}
      </div>

      <p className="p-4 text-center text-sm text-white/70">
        כוון את הברקוד לתוך המסגרת — הזיהוי אוטומטי
      </p>
    </div>
  )
}
