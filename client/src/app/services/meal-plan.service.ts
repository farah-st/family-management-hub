import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MealPlan, MealPlanDay, MealSlotKey } from '../models/meal-plan.model';

const STORAGE_KEY = 'fmh_meal_plan_v1';

@Injectable({ providedIn: 'root' })
export class MealPlanService {
  private mealPlanSubject = new BehaviorSubject<MealPlan>(this.loadOrCreateCurrentWeek());
  readonly mealPlan$ = this.mealPlanSubject.asObservable();

  // -----------------------------
  // Public API
  // -----------------------------
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

  clearWeek(): void {
    const base = this.createWeek(new Date(this.mealPlanSubject.value.weekStartIso));
    this.update(base);
  }

  goToWeek(offsetInWeeks: number): void {
    const baseDate = new Date(this.mealPlanSubject.value.weekStartIso);
    baseDate.setDate(baseDate.getDate() + offsetInWeeks * 7);
    const week = this.createWeek(baseDate);
    this.update(week);
  }

  resetToCurrentWeek(): void {
    const week = this.createWeek(this.getMonday(new Date()));
    this.update(week);
  }

  // -----------------------------
  // Internal helpers
  // -----------------------------
  private update(plan: MealPlan): void {
    this.mealPlanSubject.next(plan);
    this.save(plan);
  }

  private loadOrCreateCurrentWeek(): MealPlan {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as MealPlan;
      } catch {
        console.warn('Invalid meal plan in storage, resetting.');
      }
    }
    return this.createWeek(this.getMonday(new Date()));
  }

  private save(plan: MealPlan): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  }

  private createWeek(anyDateInWeek: Date): MealPlan {
    const monday = this.getMonday(anyDateInWeek);
    const days: MealPlanDay[] = [];

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      days.push({
        dateIso: d.toISOString().slice(0, 10),
        label: dayLabels[i],
        slots: {
          breakfast: null,
          lunch: null,
          dinner: null,
        },
      });
    }

    return {
      weekStartIso: monday.toISOString().slice(0, 10),
      days,
    };
  }

  /** Returns Monday of the week for a given date */
  private getMonday(date: Date): Date {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay(); // 0 = Sun, 1 = Mon ...
    const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
    d.setUTCDate(d.getUTCDate() + diff);
    return d;
  }
}
