import type { Metadata } from "next";
import { getAllOpportunities } from "@/lib/opportunities-data";
import { buildCalendarEvents } from "@/lib/calendarEvents";
import MonthlyCalendar from "@/components/MonthlyCalendar";

export const metadata: Metadata = {
  title: "Important Dates Calendar",
  description:
    "Monthly calendar of scholarship, government job and admission opening dates, last dates, correction windows, exam dates, admit-card releases and results in India.",
};

export default async function CalendarPage() {
  const opportunities = await getAllOpportunities();
  const events = buildCalendarEvents(opportunities);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Important Dates Calendar</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Application opening dates, last dates, correction windows, examination dates, admit-card release, results
          and counselling dates in one place. Filter by opportunity type and state, then click any entry for full
          details.
        </p>
      </header>
      <MonthlyCalendar events={events} />
    </div>
  );
}
