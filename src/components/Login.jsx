import { useState } from 'react'
import { supabase } from '../supabaseClient'

/*
  מסך כניסה עם Magic Link (קישור קסם):
  מזינים אימייל → Supabase שולח קישור למייל → לחיצה עליו מחזירה session.
  אין סיסמאות לנהל. רק שתי כתובות האימייל שב-RLS יכולות בכלל לגשת לנתונים.
*/
export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin,
        // אבטחה: לא יוצרים משתמשים חדשים — רק שני החשבונות הקיימים
        // יכולים להיכנס. מונע הרשמה פתוחה וניצול לשליחת ספאם-מיילים.
        shouldCreateUser: false,
      },
    })
    setLoading(false)
    if (error) setError('שליחה נכשלה: ' + error.message)
    else setSent(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mist p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-8 shadow-sm">
        <h1 className="text-center font-display text-3xl font-extrabold">
          Keep<span className="text-amber">It</span>
        </h1>

        {sent ? (
          <p className="mt-6 text-center leading-relaxed">
            שלחנו קישור כניסה ל־
            <span className="font-semibold">{email}</span>.
            <br />
            פתח/י את המייל ולחצ/י על הקישור כדי להיכנס.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
            <p className="text-center text-faint">היכנס/י עם קישור למייל — בלי סיסמה</p>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-ink/10 bg-card px-3 py-2 text-center focus:outline-2 focus:outline-keep"
              autoFocus
            />
            {error && <p className="text-center font-semibold text-danger">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-keep py-3 font-display font-bold text-white hover:opacity-90 disabled:opacity-40"
            >
              {loading ? 'שולח...' : 'שלח לי קישור כניסה'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
