import { createClient } from '@supabase/supabase-js'

/*
  לקוח Supabase יחיד לכל האפליקציה.
  הערכים מגיעים ממשתני סביבה (Vite חושף רק כאלה שמתחילים ב-VITE_):
    VITE_SUPABASE_URL       — כתובת הפרויקט (https://xxxx.supabase.co)
    VITE_SUPABASE_ANON_KEY  — מפתח ה-publishable (בטוח לצד לקוח כי RLS מגן)
  ראו .env.example. הקובץ .env.local (עם הערכים האמיתיים) לא נכנס ל-git.
*/
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'חסרים משתני סביבה של Supabase. צרו .env.local לפי .env.example והפעילו מחדש את השרת.',
  )
}

export const supabase = createClient(url, key)
