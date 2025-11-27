export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner';

export interface MealPlanDay {
  /** ISO date string, e.g. "2025-11-24" */
  dateIso: string;
  /** "Mon", "Tue", etc. – purely for display */
  label: string;
  /** recipe IDs for each slot; null means empty */
  slots: Record<MealSlotKey, string | null>;
}

export interface MealPlan {
  /** ISO date string for the Monday (or chosen start) of the week */
  weekStartIso: string;
  days: MealPlanDay[]; // always length 7
}