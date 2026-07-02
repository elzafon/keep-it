import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { daysLeft } from './utils/expiry'
import VoucherCard from './components/VoucherCard'
import AddVoucherForm from './components/AddVoucherForm'
import EmptyState from './components/EmptyState'

/*
  הקומפוננטה הראשית.

  שני רעיונות מרכזיים כאן:
  1. "ניתוב" פשוט עם useState — screen קובע איזה מסך מוצג.
     כשהאפליקציה תגדל, נחליף את זה ב-react-router.
  2. useLiveQuery — hook של Dexie שמאזין למסד הנתונים:
     כל שינוי (הוספה/מחיקה/עדכון) מרנדר מחדש אוטומטית. אין צורך "לרענן".
*/
export default function App() {
  const [screen, setScreen] = useState('dashboard') // 'dashboard' | 'add'
  const [showRedeemed, setShowRedeemed] = useState(false)

  // שליפה חיה מהמסד, ממוינת: קרוב-לפוג קודם, ללא-תוקף בסוף
  const vouchers = useLiveQuery(async () => {
    const all = await db.vouchers.toArray()
    return all.sort((a, b) => {
      const da = daysLeft(a.expiry) ?? Infinity
      const db_ = daysLeft(b.expiry) ?? Infinity
      return da - db_
    })
  })

  // עד שהשליפה הראשונה מסתיימת, vouchers הוא undefined
  if (!vouchers) return null

  const active = vouchers.filter((v) => !v.redeemed)
  const redeemed = vouchers.filter((v) => v.redeemed)
  const totalAmount = active.reduce((sum, v) => sum + (v.amount || 0), 0)

  return (
    <div className="min-h-screen pb-24">
      {/* כותרת עליונה */}
      <header className="bg-keep-deep px-4 pb-10 pt-6 text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-2xl font-extrabold">
            Keep<span className="text-amber">It</span>
          </h1>
          <p className="mt-1 text-sm opacity-80">
            {active.length > 0
              ? `${active.length} שוברים פעילים · ₪${totalAmount.toLocaleString()} שווי כולל`
              : 'שומר על הכסף שלך'}
          </p>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-2xl px-4">
        {screen === 'add' ? (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <AddVoucherForm onClose={() => setScreen('dashboard')} />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <EmptyState onAdd={() => setScreen('add')} />
          </div>
        ) : (
          <>
            {/* רשימת השוברים הפעילים */}
            <div className="flex flex-col gap-3">
              {active.map((v) => (
                // key עוזר ל-React לזהות כל פריט ברשימה ביעילות
                <VoucherCard key={v.id} voucher={v} />
              ))}
              {active.length === 0 && (
                <p className="rounded-2xl bg-card p-6 text-center text-faint shadow-sm">
                  כל השוברים מומשו 🎉
                </p>
              )}
            </div>

            {/* שוברים שמומשו — מוסתרים כברירת מחדל */}
            {redeemed.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowRedeemed(!showRedeemed)}
                  className="mb-3 text-sm font-semibold text-faint hover:text-ink"
                >
                  {showRedeemed ? '▾' : '◂'} שוברים שמומשו ({redeemed.length})
                </button>
                {showRedeemed && (
                  <div className="flex flex-col gap-3">
                    {redeemed.map((v) => (
                      <VoucherCard key={v.id} voucher={v} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* כפתור הוספה צף */}
      {screen === 'dashboard' && vouchers.length > 0 && (
        <button
          onClick={() => setScreen('add')}
          aria-label="הוסף שובר"
          className="fixed bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-keep font-display text-3xl font-bold text-white shadow-lg hover:opacity-90"
        >
          +
        </button>
      )}
    </div>
  )
}
