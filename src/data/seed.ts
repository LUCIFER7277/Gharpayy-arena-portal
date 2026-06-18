import type {
  Employee,
  AppTask,
  AppLeave,
  CalEvent,
  Kudo,
  AppNotif,
  Anomaly,
  OneOnOne,
  Candidate,
} from "@/types/hr";

export type * from "@/types/hr";

export const EMPLOYEES: Employee[] = [];
export const SEED_KUDOS: Kudo[] = [];
export const SEED_TASKS: AppTask[] = [];
export const SEED_LEAVES: AppLeave[] = [];
export const SEED_CAL: CalEvent[] = [];
export const SEED_NOTIFS: AppNotif[] = [];
export const SEED_ANOMALIES: Anomaly[] = [];
export const SEED_ONE_ON_ONES: OneOnOne[] = [];
export const SEED_CANDIDATES: Candidate[] = [];
