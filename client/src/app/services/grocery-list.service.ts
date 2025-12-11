// grocery-list.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Ingredient } from '../models/ingredient.model';

const KEY = 'fmh_grocery_v2';

type RawGroceryItem = { _id?: string; id?: string; name: string; qty?: string | number };

@Injectable({ providedIn: 'root' })
export class GroceryListService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/grocery`;

  // Keep the same shape your components expect:
  // items: Ingredient[] where Ingredient ~ { name, qty? } (we’ll optionally store an id internally)
  private items: (Ingredient & { id?: string })[] = [];

  constructor() {
    // Load local cache first so UI renders immediately
    const raw = localStorage.getItem(KEY);
    this.items = raw ? (JSON.parse(raw) as (Ingredient & { id?: string })[]) : [];
    // Then try to refresh from server (non-blocking)
    this.http.get<RawGroceryItem[]>(this.base).subscribe({
      next: (arr) => {
        if (!arr || arr.length === 0) {
          return;
        }
        const normalized = arr.map(this.toIngredient);
        this.items = normalized;
        this.persist();
      },
      error: () => {
      }
    });
  }


  /** Same as before: synchronous copy */
  list(): Ingredient[] {
    return this.items.map(({ id, ...rest }) => rest);
  }

  /** Same signature: add many. If no bulk endpoint, POST each item. */
  addMany(newItems: Ingredient[]) {
    // Optimistic update for snappy UI
    const optimisticWithTempIds = newItems.map(it => ({ ...it }));
    this.items = [...optimisticWithTempIds, ...this.items];
    this.persist();

    // Try to sync to server (POST each). If you add /grocery/bulk, swap this loop for one call.
    newItems.forEach(it => {
      this.http.post<RawGroceryItem>(this.base, it).subscribe({
        next: (created) => {
          const normalized = this.toIngredient(created);
          // Replace the first matching optimistic item (by name+qty heuristic)
          const idx = this.items.findIndex(x => !x.id && x.name === it.name && x.qty === it.qty);
          if (idx > -1) this.items[idx] = normalized;
          else this.items = [normalized, ...this.items];
          this.persist();
        },
        error: () => {
          // Optional: rollback or show a toast
        }
      });
    });
  }

  /** Same signature: remove by index */
  remove(index: number) {
    const target = this.items[index];
    if (!target) return;

    // Optimistic local removal
    this.items.splice(index, 1);
    this.persist();

    // If we have an id (came from server), delete remotely
    if ((target as any).id) {
      this.http.delete<void>(`${this.base}/${(target as any).id}`).subscribe({
        error: () => {
          // Optional: rollback or toast
        }
      });
    }
  }

  /** Same signature: clear all */
  clear() {
    const prev = this.items;
    this.items = [];
    this.persist();

    // Attempt to clear server too
    this.http.delete<void>(this.base).subscribe({
      error: () => {
        // Optional: rollback local if needed
        this.items = prev;
        this.persist();
      }
    });
  }

  // ---- helpers ----
  private toIngredient = (r: RawGroceryItem): Ingredient & { id?: string } => {
    const id = r._id ?? r.id;
    const { name, qty } = r;
    return { name, qty, ...(id ? { id } : {}) };
  };

  private persist() {
    localStorage.setItem(KEY, JSON.stringify(this.items));
  }
}
