import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fetchVouchers } from '../db'

/*
  useVouchers — מחליף את useLiveQuery של Dexie.
  1. שליפה ראשונית מ-Supabase.
  2. מנוי Realtime: כל שינוי בטבלה (הוספה/עדכון/מחיקה, גם מהמכשיר של
     בן/בת הזוג) מפעיל שליפה מחדש — כך שני הצדדים רואים אותו מצב.

  חשוב: נרשמים ל-Realtime רק כשיש משתמש מחובר (session). Realtime מכבד
  RLS, ולכן הערוץ חייב token מחובר כדי לקבל אירועים.

  מחזיר { vouchers, error, reload }:
  - vouchers: null בזמן טעינה, אחרת מערך.
  - error: כשל שליפה מוצג למשתמש במקום להתחזות ל"אין שוברים"
    (אחרת ניתוק רשת נראה כאילו כל הנתונים נמחקו).
*/
export function useVouchers(session) {
  const [vouchers, setVouchers] = useState(null)
  const [error, setError] = useState(null)
  const userId = session?.user?.id

  const load = useCallback(() => {
    if (!userId) return
    fetchVouchers()
      .then((data) => {
        setVouchers(data)
        setError(null)
      })
      .catch((err) => setError(err?.message || 'שגיאת רשת'))
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setVouchers(null)
      setError(null)
      return
    }

    load()

    // ערוץ Realtime שמאזין לכל שינוי בטבלת vouchers ומרענן
    const channel = supabase
      .channel('vouchers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, load)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, load])

  return { vouchers, error, reload: load }
}
