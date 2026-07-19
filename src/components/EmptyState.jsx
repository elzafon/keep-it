import { seedDemoData } from '../db'

/* מסך ריק הוא הזמנה לפעולה — לא סתם "אין נתונים" */
export default function EmptyState({ onAdd }) {
  return (
    <div className="mt-16 text-center">
      <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-keep/10 text-4xl">
        🎟️
      </div>
      <h2 className="font-display text-xl font-bold">אין כאן שוברים עדיין</h2>
      <p className="mx-auto mt-2 max-w-xs text-faint">
        כל גיפט קארד, קופון או תו קנייה שתוסיפו יישמר בענן ויסונכרן בין המכשירים שלכם.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          onClick={onAdd}
          className="rounded-xl bg-keep px-6 py-3 font-display font-bold text-white hover:opacity-90"
        >
          + הוסף שובר ראשון
        </button>
        <button
          onClick={seedDemoData}
          className="rounded-xl px-4 py-3 font-semibold text-faint hover:text-ink"
        >
          טען דוגמאות
        </button>
      </div>
    </div>
  )
}
