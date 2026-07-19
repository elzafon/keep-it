/*
  פרסר להדבקת קופונים מהודעת SMS
  --------------------------------
  פונקציה טהורה: מקבלת טקסט גולמי ומחזירה מערך של אובייקטי-שובר.
  היא לא נוגעת ב-DB ולא ב-React — ולכן:
    1. קל לבדוק אותה (קלט מחרוזת → פלט מערך, בלי תלות בשום דבר).
    2. היא תמשיך לעבוד כמו שהיא גם אחרי המעבר ל-Supabase —
       רק שכבת ה-DB משתנה, הלוגיקה הטהורה נשארת.

  מבנה ההודעה חוזר על עצמו: כותרת משותפת (עסק, מקור, הטבה, תוקף)
  ואחריה כמה בלוקים של "קוד / קוד אימות / תוקף". לכן אנחנו מחלצים
  את השדות המשותפים פעם אחת, ואת הקודים דרך matchAll (כל ההופעות).
*/

// המרת חלקי תאריך ל-YYYY-MM-DD (הפורמט ש-input[type=date] מבין)
function isoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// היום האחרון בחודש — לשימוש כשהקופון נותן רק חודש/שנה (MM/YY)
function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate() // יום 0 של החודש הבא = היום האחרון בנוכחי
}

export function parseVouchers(text) {
  if (!text || !text.trim()) return []

  // ---- שדות משותפים (מופיעים פעם אחת) ----

  // מקור/מנפיק: כרגע מזהים את מפעל הפיס לפי "פיס פלוס" / "מפעל הפיס"
  const source = /פיס\s*פלוס|מפעל\s*הפיס/.test(text) ? 'מפעל הפיס' : ''

  // בית עסק: הטקסט שאחרי "ברשת" (למשל "ברשת מקדונלד'ס")
  const bizMatch = text.match(/ברשת\s+([^\s,.\n]+)/)
  const business = bizMatch ? bizMatch[1] : ''

  // תיאור ההטבה: מה שבין "הקוד למימוש ההטבה" ל-"הינו".
  // מנקים "ברשת <עסק>" מהסוף כי זה כבר יושב בשדה business.
  const benefitMatch = text.match(/הקוד למימוש ההטבה\s+([\s\S]+?)\s+הינו/)
  const benefit = benefitMatch
    ? benefitMatch[1].trim().replace(/\s*ברשת\s+\S+\s*$/, '').trim()
    : ''

  // תוקף כללי מדויק: "תוקף למימוש ההטבה: 29-05-2028" → 2028-05-29
  const fullDate = text.match(/תוקף למימוש[\s\S]*?(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  const sharedExpiry = fullDate ? isoDate(fullDate[3], fullDate[2], fullDate[1]) : ''

  // ---- שדות לכל קופון (מופיעים כמה פעמים) ----

  // מזהים קודים בשני פורמטים של פיס פלוס, בלי להסתמך על המילה "קוד:":
  //   • מקדונלד'ס — 16 ספרות: 9376-7601-5496-4429
  //   • Multipass (מפרץ ההרפתקאות / rebar / כאל) — 154346039-2496 (9 ספרות–4)
  // הגבולות (?<!\d) / (?!\d) מונעים לכידת תת-מחרוזת מתוך מספר ארוך יותר
  const codes = [...text.matchAll(/(?<![\d-])(\d{4}-\d{4}-\d{4}-\d{4}|\d{9}-\d{4})(?![\d-])/g)].map(
    (m) => m[1],
  )
  // כל קודי האימות (CVV), לפי הסדר
  const cvvs = [...text.matchAll(/קוד\s*אימות:\s*(\d{3,4})/g)].map((m) => m[1])
  // תוקף פר-קופון בפורמט MM/YY (גיבוי אם אין תוקף כללי) → סוף אותו חודש
  const monthExps = [...text.matchAll(/תוקף:\s*(\d{2})\/(\d{2})/g)].map((m) => {
    const year = 2000 + Number(m[2])
    return isoDate(year, m[1], lastDayOfMonth(year, Number(m[1])))
  })

  // מרכיבים שובר אחד לכל קוד. השדות המשותפים משוכפלים על כולם;
  // המשתמש/ת יכול/ה לערוך כל שורה בנפרד לפני שמירה.
  return codes.map((code, i) => ({
    business,
    source,
    type: 'קופון',
    amount: null, // הטבה, לא סכום כספי — נשאר ריק
    // 16 ספרות נשמר רצוף (הקלדה בקופה); Multipass נשמר עם המקף כפי שמוצג
    barcode: /^\d{4}-\d{4}-\d{4}-\d{4}$/.test(code) ? code.replace(/-/g, '') : code,
    cvv: cvvs[i] ?? '',
    expiry: sharedExpiry || monthExps[i] || '',
    benefit,
    notes: '',
  }))
}
