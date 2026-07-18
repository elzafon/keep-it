import { useEffect, useState } from 'react'
import { markNotified } from './db'
import { useVouchers } from './hooks/useVouchers'
import { supabase } from './supabaseClient'
import { daysLeft, expiryLabel } from './utils/expiry'
import VoucherCard from './components/VoucherCard'
import AddVoucherForm from './components/AddVoucherForm'
import PasteVouchers from './components/PasteVouchers'
import EmptyState from './components/EmptyState'
import Login from './components/Login'

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
  const [addTab, setAddTab] = useState('manual') // 'manual' | 'paste' — רק במסך הוספה
  const [showRedeemed, setShowRedeemed] = useState(false)
  // השובר שנמצא כרגע בעריכה (null = טופס ה"הוספה" פתוח, לא עריכה)
  const [editing, setEditing] = useState(null)
  // מצב ההרשאה להתראות — נקרא פעם אחת מה-API של הדפדפן
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  )
  // מצב האימות: session = המשתמש המחובר (null = לא מחובר)
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  // בטעינה: קוראים את ה-session הקיים ומאזינים לשינויים (כניסה/יציאה)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // שליפה מ-Supabase עם עדכון בזמן אמת, ואז מיון: קרוב-לפוג קודם.
  // מעבירים session כדי שה-hook יירשם ל-Realtime רק כשמחוברים.
  const raw = useVouchers(session)
  const vouchers =
    raw &&
    [...raw].sort((a, b) => (daysLeft(a.expiry) ?? Infinity) - (daysLeft(b.expiry) ?? Infinity))

  /*
    תופעת לוואי (side effect): בכל פעם ש-vouchers מתעדכן, בודקים אם יש
    שוברים שעומדים לפוג בקרוב ושולחים התראת דפדפן. השדה notifiedOn נשמר
    על השובר עצמו כדי שלא נשלח את אותה התראה שוב באותו היום.
    מגבלה: זה עובד רק כשהאפליקציה פתוחה בדפדפן — אין שרת שישלח
    התראות כשהיא סגורה (Push דורש backend, וזה בניגוד לעקרון "אין שרת").
  */
  useEffect(() => {
    if (!vouchers) return
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const todayKey = new Date().toISOString().slice(0, 10)
    vouchers
      .filter((v) => !v.redeemed)
      .forEach((v) => {
        const d = daysLeft(v.expiry)
        const dueSoon = d !== null && d >= 0 && d <= 3
        if (dueSoon && v.notifiedOn !== todayKey) {
          new Notification(`${v.business} — השובר עומד לפוג`, {
            body: expiryLabel(v.expiry),
            tag: `voucher-${v.id}`,
          })
          markNotified(v.id, todayKey)
        }
      })
  }, [vouchers])

  async function enableReminders() {
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  function openAdd() {
    setEditing(null)
    setAddTab('manual')
    setScreen('add')
  }

  function openEdit(voucher) {
    setEditing(voucher)
    setScreen('add')
  }

  function closeForm() {
    setEditing(null)
    setScreen('dashboard')
  }

  // שער אימות: עד שקראנו את ה-session — לא מציגים כלום; בלי session — מסך כניסה
  if (!authReady) return null
  if (!session) return <Login />

  // עד שהשליפה הראשונה מסתיימת, vouchers הוא null
  if (!vouchers) return null

  const active = vouchers.filter((v) => !v.redeemed)
  const redeemed = vouchers.filter((v) => v.redeemed)
  const totalAmount = active.reduce((sum, v) => sum + (v.amount || 0), 0)

  return (
    <div className="min-h-screen pb-24">
      {/* כותרת עליונה */}
      <header className="bg-keep-deep px-4 pb-10 pt-6 text-white">
        <div className="mx-auto flex max-w-2xl items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold">
              Keep<span className="text-amber">It</span>
            </h1>
            <p className="mt-1 text-sm opacity-80">
              {active.length > 0
                ? `${active.length} שוברים פעילים · ₪${totalAmount.toLocaleString()} שווי כולל`
                : 'שומר על הכסף שלך'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {notifPermission === 'default' && (
              <button
                onClick={enableReminders}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
              >
                🔔 הפעל תזכורות
              </button>
            )}
            <button
              onClick={signOut}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              התנתק
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-5 max-w-2xl px-4">
        {screen === 'add' ? (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            {/* טאבים — רק בהוספה חדשה. בעריכה תמיד טופס ידני. */}
            {!editing && (
              <div className="mb-6 flex gap-1 rounded-xl bg-mist p-1">
                {[
                  ['manual', 'מילוי ידני'],
                  ['paste', 'הדבקה מ-SMS'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setAddTab(id)}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                      addTab === id ? 'bg-card text-ink shadow-sm' : 'text-faint hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/*
              key משתנה בין 'new' לבין מזהה השובר הנערך: כש-key משתנה,
              React הורס את הקומפוננטה הישנה ובונה חדשה עם state נקי.
              ככה מעבר מעריכת שובר א' לשובר ב' (או ל"הוספה") תמיד פותח
              טופס עם הערכים הנכונים, בלי קוד איפוס ידני.
            */}
            {editing || addTab === 'manual' ? (
              <AddVoucherForm key={editing?.id ?? 'new'} voucher={editing} onClose={closeForm} />
            ) : (
              <PasteVouchers onClose={closeForm} />
            )}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <EmptyState onAdd={openAdd} />
          </div>
        ) : (
          <>
            {/* רשימת השוברים הפעילים */}
            <div className="flex flex-col gap-3">
              {active.map((v) => (
                // key עוזר ל-React לזהות כל פריט ברשימה ביעילות
                <VoucherCard key={v.id} voucher={v} onEdit={openEdit} />
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
                      <VoucherCard key={v.id} voucher={v} onEdit={openEdit} />
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
          onClick={openAdd}
          aria-label="הוסף שובר"
          className="fixed bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-keep font-display text-3xl font-bold text-white shadow-lg hover:opacity-90"
        >
          +
        </button>
      )}
    </div>
  )
}
