import { Opportunity, CalendarEvent } from "./types";

const EVENT_FIELDS: { field: keyof Opportunity; eventType: CalendarEvent["eventType"]; suffix: string }[] = [
  { field: "opening_date", eventType: "opening_date", suffix: "opens" },
  { field: "closing_date", eventType: "closing_date", suffix: "last date" },
  { field: "correction_deadline", eventType: "correction_deadline", suffix: "correction window closes" },
  { field: "exam_date", eventType: "exam_date", suffix: "examination" },
  { field: "admit_card_date", eventType: "admit_card_date", suffix: "admit card release" },
  { field: "result_date", eventType: "result_date", suffix: "result" },
];

export function buildCalendarEvents(opportunities: Opportunity[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const o of opportunities) {
    for (const { field, eventType, suffix } of EVENT_FIELDS) {
      const value = o[field];
      if (typeof value === "string" && value) {
        events.push({
          opportunityId: o.id,
          title: `${o.title} — ${suffix}`,
          opportunity_type: o.opportunity_type,
          eventType,
          date: value,
          state: o.state,
          education_level: o.education_level,
        });
      }
    }
  }
  return events.sort((a, b) => a.date.localeCompare(b.date));
}
