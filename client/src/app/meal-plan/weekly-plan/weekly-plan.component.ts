import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { combineLatest, map } from 'rxjs';

import { MealPlanService } from '../../services/meal-plan.service';
import { MealSlotKey } from '../../models/meal-plan.model';
import { RecipeService } from '../../services/recipe.service';


type Slot = MealSlotKey;

@Component({
  selector: 'app-weekly-plan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './weekly-plan.component.html',
  styleUrls: ['./weekly-plan.component.scss'],
})
export class WeeklyPlanComponent {
  private mealPlanSvc = inject(MealPlanService);
  private recipeSvc = inject(RecipeService);

  slots: Slot[] = ['breakfast', 'lunch', 'dinner'];

  // state for the "picker"
  picker = {
    open: false,
    dayIndex: 0 as number,
    slot: 'breakfast' as Slot,
    selectedRecipeId: '' as string,
  };

  vm$ = combineLatest([this.mealPlanSvc.mealPlan$, this.recipeSvc.recipes$]).pipe(
    map(([plan, recipes]) => ({
      plan,
      recipes,
      recipesById: Object.fromEntries(recipes.map(r => [r.id, r] as const)),
    }))
  );

  openPicker(dayIndex: number, slot: Slot, currentRecipeId: string | null): void {
    this.picker.open = true;
    this.picker.dayIndex = dayIndex;
    this.picker.slot = slot;
    this.picker.selectedRecipeId = currentRecipeId ?? '';
  }

  closePicker(): void {
    this.picker.open = false;
  }

  savePicker(): void {
    const recipeId = this.picker.selectedRecipeId || null;
    this.mealPlanSvc.setRecipe(this.picker.dayIndex, this.picker.slot, recipeId);
    this.closePicker();
  }

  clearCell(dayIndex: number, slot: Slot): void {
    this.mealPlanSvc.setRecipe(dayIndex, slot, null);
  }

  prevWeek(): void {
    this.mealPlanSvc.goToWeek(-1);
  }

  nextWeek(): void {
    this.mealPlanSvc.goToWeek(1);
  }

  resetWeek(): void {
    this.mealPlanSvc.resetToCurrentWeek();
  }

  trackByDayIndex = (_: number, __: unknown) => _;

  savePlan(): void {
    this.mealPlanSvc.saveCurrentPlan();
  }

}
