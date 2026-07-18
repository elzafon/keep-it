import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { fetchVouchers } from '../db'

/*
  useVouchers — מחליף את useLiveQuery של Dexie.
  1. שליפה ראשונית מ-Supabase.
  2. מנוי Realtime: כל שינוי בטבלה (הוספה/עדכון/מחיקה, גם מהמכשיר של
     בן/בת הזוג) מפעיל שליפה מחדש — כך שני הצדדים רואים אותו מצב.

  מחזיר null בזמן הטעינה הראשונה (כמו useLiveQuery), ואז מערך שוברים.
*/
export function useVouchers() {
  const [vouchers, setVouchers] = useState(null)

  useEffect(() => {
    let active = true

    const load = () =>
      fetchVouchers()
        .then((data) => active && setVouchers(data))
        .catch(() => active && setVouchers([]))

    load()

    // ערוץ Realtime שמאזין לכל שינוי בטבלת vouchers ומרענן
    const channel = supabase
      .channel('vouchers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vouchers' }, load)
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  return vouchers
}
