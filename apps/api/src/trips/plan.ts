import { dayPlans, planItems } from '../db/schema';

export type PlanItemRow = typeof planItems.$inferSelect & { date: string };
export const planItemColumns = {
  id: planItems.id,
  dayPlanId: planItems.dayPlanId,
  kind: planItems.kind,
  reservationId: planItems.reservationId,
  placeId: planItems.placeId,
  title: planItems.title,
  subtitle: planItems.subtitle,
  startTime: planItems.startTime,
  endTime: planItems.endTime,
  position: planItems.position,
  date: dayPlans.date,
};

/** "09:00:00" → "09:00" */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export const toPlanItem = (r: PlanItemRow) => ({
  id: r.id,
  date: r.date,
  kind: r.kind,
  title: r.title,
  subtitle: r.subtitle,
  startTime: hhmm(r.startTime),
  endTime: hhmm(r.endTime),
  placeId: r.placeId,
});
export type ApiPlanItem = ReturnType<typeof toPlanItem>;
