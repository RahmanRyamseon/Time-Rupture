"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarEvent, OpportunityType } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/helpers";
import { INDIAN_STATES } from "@/lib/data/states";

const EVENT_TYPE_LABEL: Record<CalendarEvent["eventType"], string> = {
  opening_date: "Opening",
  closing_date: "Last date",
  correction_deadline: "Correction window",
  exam_date: "Exam",
  admit_card_date: "Admit card",
  result_date: "Result",
};

const EVENT_TYPE_COLOR: Record<CalendarEvent["eventType"], string> = {
  opening_date: "bg-blue-100 text-blue-800",
  closing_date: "bg-red-100 text-red-800",
  correction_deadline: "bg-amber-100 text-amber-800",
  exam_date: "bg-purple-100 text-purple-800",
  admit_card_date: "bg-indigo-100 text-indigo-800",
  result_date: "bg-emerald-100 text-emerald-800",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthlyCalendar({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [typeFilter, setTypeFilter] = useState<OpportunityType | "">("");
  const [stateFilter, setStateFilter] = useState("");

  const filtered = useMemo(
    () =>
      events.filter((e) => {
        if (typeFilter && e.opportunity_type !== typeFilter) return false;
        if (stateFilter && e.state !== stateFilter && e.state !== "All India") return false;
        return true;
      }),
    [events, typeFilter, stateFilter]
  );

  const { year, month } = cursor;
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of filtered) {
      const d = new Date(e.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        map.set(day, [...(map.get(day) ?? []), e]);
      }
    }
    return map;
  }, [filtered, year, month]);

  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as OpportunityType | "")}
          className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All opportunity types</option>
          {(Object.keys(TYPE_LABEL) as OpportunityType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="rounded-md border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm"
        >
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => (
            <option key={s.slug} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }))}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
            aria-label="Previous month"
          >
            ← Prev
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }))}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm"
            aria-label="Next month"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-border)] text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-[var(--color-navy)] px-2 py-1.5 text-center font-semibold text-white">
            {d}
          </div>
        ))}
        {cells.map((day, idx) => (
          <div key={idx} className="min-h-[6rem] bg-[var(--color-card)] p-1.5 align-top">
            {day && (
              <>
                <p className="mb-1 text-right font-semibold text-slate-500">{day}</p>
                <ul className="space-y-1">
                  {(eventsByDay.get(day) ?? []).slice(0, 3).map((e, i) => (
                    <li key={i}>
                      <Link
                        href={`/opportunity/${e.opportunityId}`}
                        className={`block truncate rounded px-1 py-0.5 ${EVENT_TYPE_COLOR[e.eventType]}`}
                        title={e.title}
                      >
                        {EVENT_TYPE_LABEL[e.eventType]}: {e.title}
                      </Link>
                    </li>
                  ))}
                  {(eventsByDay.get(day)?.length ?? 0) > 3 && (
                    <li className="text-[10px] text-slate-400">+{(eventsByDay.get(day)!.length) - 3} more</li>
                  )}
                </ul>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
