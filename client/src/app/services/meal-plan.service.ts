import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MealPlan, MealPlanDay, MealSlotKey } from '../models/meal-plan.model';

const STORAGE_KEY = 'fmh_meal_plan_v1';

@Injectable({ providedIn: 'root' })
export class MealPlanService {
  private mealPlanSubject = new BehaviorSubject<MealPlan>(
    this.loadOrCreateCurrentWeek()
  );
  readonly mealPlan$ = this.mealPlanSubject.asObservable();

  // -----------------------------
  // Public API
  // -----------------------------

  /**
   * Set (or clear) a recipe for a specific day/slot in the current week.
   */
  setRecipe(dayIndex: number, slot: MealSlotKey, recipeId: string | null): void {
    const current = this.mealPlanSubject.value;
    if (!current.days[dayIndex]) return;

    const updatedDays = current.days.map((d, i) =>
      i === dayIndex
        ? {
            ...d,
            slots: {
              ...d.slots,
              [slot]: recipeId,
            },
          }
        : d
    );

    const updated: MealPlan = { ...current, days: updatedDays };
    this.update(updated);
  }

  /**
   * Clear the current week (same week range, just empty slots).
   */
  clearWeek(): void {
    const base = this.createWeek(new Date(this.mealPlanSubject.value.weekStartIso));
    this.update(base);
  }

  /**
   * Navigate to previous/next week relative to the currently selected one.
   * offsetInWeeks = -1 → previous week, +1 → next week.
   * If a plan for that week exists, it loads it; otherwise it creates a new empty plan.
   */
  goToWeek(offsetInWeeks: number): void {
    const currentWeekStart = new Date(this.mealPlanSubject.value.weekStartIso);
    currentWeekStart.setDate(currentWeekStart.getDate() + offsetInWeeks * 7);

    const monday = this.getMonday(currentWeekStart);
    const weekStartIso = this.toIsoDate(monday);

    const existing = this.getStoredPlan(weekStartIso);
    if (existing) {
      this.update(existing);
      return;
    }

    const week = this.createWeek(monday);
    this.update(week);
  }

  /**
   * Jump to the *current* week (based on today).
   * If that week is already stored, reuse it; otherwise create a fresh one.
   */
  resetToCurrentWeek(): void {
    const currentMonday = this.getMonday(new Date());
    const weekStartIso = this.toIsoDate(currentMonday);

    const existing = this.getStoredPlan(weekStartIso);
    if (existing) {
      this.update(existing);
      return;
    }

    const week = this.createWeek(currentMonday);
    this.update(week);
  }

  /**
   * Explicit save hook (even though update() already persists).
   * Useful for wiring to a "Save Plan" button.
   */
  saveCurrentPlan(): void {
    const current = this.mealPlanSubject.value;
    this.save(current);
  }

  // -----------------------------
  // Internal helpers
  // -----------------------------

  /**
   * Push a new plan into the BehaviorSubject and persist it.
   */
  private update(plan: MealPlan): void {
    this.mealPlanSubject.next(plan);
    this.save(plan);
  }

  /**
   * Load the plan for the *current week* from storage
   * or create a fresh one if it doesn't exist.
   */
  private loadOrCreateCurrentWeek(): MealPlan {
    const currentMonday = this.getMonday(new Date());
    const currentWeekIso = this.toIsoDate(currentMonday);

    const existing = this.getStoredPlan(currentWeekIso);
    if (existing) {
      return existing;
    }

    const fresh = this.createWeek(currentMonday);
    this.save(fresh);
    return fresh;
  }

  /**
   * Persist a single week's plan into the multi-week store.
   * The store is a map: { [weekStartIso]: MealPlan }.
   */
  private save(plan: MealPlan): void {
    const allPlans = this.loadAllPlans();
    allPlans[plan.weekStartIso] = plan;
    this.persistAllPlans(allPlans);
  }

  /**
   * Build a MealPlan for the week that contains the given date.
   * The week is always Monday → Sunday.
   */
  private createWeek(anyDateInWeek: Date): MealPlan {
    const monday = this.getMonday(anyDateInWeek);
    const days: MealPlanDay[] = [];

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);

      days.push({
        dateIso: this.toIsoDate(d),
        label: dayLabels[i],
        slots: {
          breakfast: null,
          lunch: null,
          dinner: null,
        },
      });
    }

    return {
      weekStartIso: this.toIsoDate(monday),
      days,
    };
  }

  // -----------------------------
  // Date helpers
  // -----------------------------

  /**
   * Convert a Date to a "YYYY-MM-DD" ISO date string (no time).
   */
  private toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  /**
   * Returns Monday of the week for a given date, in UTC.
   *
   * Logic:
   *   - 0 = Sunday, 1 = Monday, ..., 6 = Saturday (getUTCDay())
   *   - diff = 1 - day:
   *       Monday (1) → diff = 0 (stay same day)
   *       Tuesday (2) → diff = -1 (go back 1 day)
   *       ...
   *       Saturday (6) → diff = -5 (go back to Monday)
   *       Sunday (0) → diff = 1 (move forward to next Monday)
   *
   * That means:
   *   - Mon–Sat are treated as part of the "current" week.
   *   - Sunday is treated as the start of the *upcoming* week (your desired behavior).
   */
  private getMonday(date: Date): Date {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay(); // 0 = Sun, 1 = Mon ...
    const diff = 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }

  // -----------------------------
  // Storage helpers
  // -----------------------------

  /**
   * Load the full multi-week store from localStorage.
   * If parsing fails, returns an empty object.
   */
  private loadAllPlans(): Record<string, MealPlan> {
    const storedRaw = localStorage.getItem(STORAGE_KEY);
    if (!storedRaw) return {};

    try {
      const parsed = JSON.parse(storedRaw);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, MealPlan>;
      }
    } catch {
      console.warn('Invalid meal plan store, resetting.');
    }

    return {};
  }

  /**
   * Persist the full multi-week store to localStorage.
   */
  private persistAllPlans(allPlans: Record<string, MealPlan>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allPlans));
  }

  /**
   * Get a plan for a specific week (by weekStartIso) from storage.
   */
  private getStoredPlan(weekStartIso: string): MealPlan | null {
    const allPlans = this.loadAllPlans();
    return allPlans[weekStartIso] ?? null;
  }
}
