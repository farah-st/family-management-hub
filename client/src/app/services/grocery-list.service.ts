import { Injectable } from '@angular/core';
import { Ingredient } from '../models/ingredient.model';

const KEY = 'fmh_grocery_v1';

@Injectable({ providedIn: 'root' })
export class GroceryListService {
  private items: Ingredient[] = [];

  constructor() {
    const raw = localStorage.getItem(KEY);
    this.items = raw ? JSON.parse(raw) as Ingredient[] : [];
  }

  list(): Ingredient[] { return [...this.items]; }

  addMany(newItems: Ingredient[]) {
    // naive merge; later we can normalize (e.g., combine “egg” lines)
    this.items = [...newItems, ...this.items];
    this.persist();
  }

  remove(index: number) {
    this.items.splice(index, 1);
    this.persist();
  }

  clear() { this.items = []; this.persist(); }

  private persist() { localStorage.setItem(KEY, JSON.stringify(this.items)); }
}
