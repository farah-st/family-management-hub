// grocery-list.service.ts
import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Ingredient } from '../models/ingredient.model';

const KEY = 'fmh_grocery_v2';

type RawGroceryItem = { _id?: string; id?: string; name: string; qty?: string | number };

// ---- GraphQL documents ----
const GROCERY_QUERY = gql`
  query GetGrocery {
    grocery {
      id
      name
      qty
    }
  }
`;

const ADD_GROCERY_MUTATION = gql`
  mutation AddGrocery($input: GroceryInput!) {
    addGrocery(input: $input) {
      id
      name
      qty
    }
  }
`;

const DELETE_GROCERY_MUTATION = gql`
  mutation DeleteGrocery($id: ID!) {
    deleteGrocery(id: $id)
  }
`;

const CLEAR_GROCERY_MUTATION = gql`
  mutation ClearGrocery {
    clearGrocery
  }
`;

@Injectable({ providedIn: 'root' })
export class GroceryListService {
  private apollo = inject(Apollo);

  // Keep the same shape your components expect:
  // items: Ingredient[] where Ingredient ~ { name, qty? } (we’ll optionally store an id internally)
  private items: (Ingredient & { id?: string })[] = [];

  constructor() {
    // Load local cache first so UI renders immediately
    const raw = localStorage.getItem(KEY);
    this.items = raw ? (JSON.parse(raw) as (Ingredient & { id?: string })[]) : [];

    // Then try to refresh from server (non-blocking) via GraphQL
    this.apollo
      .query<{ grocery: RawGroceryItem[] }>({
        query: GROCERY_QUERY,
        fetchPolicy: 'network-only',
      })
      .subscribe({
        next: (result) => {
          const arr = result.data?.grocery ?? [];
          if (!arr || arr.length === 0) return;

          const normalized = arr.map(this.toIngredient);
          this.items = normalized;
          this.persist();
        },
        error: () => {
          // optional: log/toast
        },
      });
  }

  /** Same as before: synchronous copy */
  list(): Ingredient[] {
    return this.items.map(({ id, ...rest }) => rest);
  }

  /** Same signature: add many. Uses GraphQL mutations instead of REST. */
  addMany(newItems: Ingredient[]) {
    // Optimistic update for snappy UI
    const optimisticWithTempIds = newItems.map((it) => ({ ...it }));
    this.items = [...optimisticWithTempIds, ...this.items];
    this.persist();

    // Sync to server via GraphQL (one mutation per item)
    newItems.forEach((it) => {
      const input = {
        name: it.name,
        qty: it.qty != null ? String(it.qty) : '',
      };

      this.apollo
        .mutate<{ addGrocery: RawGroceryItem }>({
          mutation: ADD_GROCERY_MUTATION,
          variables: { input },
        })
        .subscribe({
          next: (result) => {
            const created = result.data?.addGrocery;
            if (!created) return;

            const normalized = this.toIngredient(created);
            // Replace the first matching optimistic item (by name+qty heuristic)
            const idx = this.items.findIndex(
              (x) => !x.id && x.name === it.name && x.qty === it.qty
            );
            if (idx > -1) this.items[idx] = normalized;
            else this.items = [normalized, ...this.items];
            this.persist();
          },
          error: () => {
            // Optional: rollback or toast
          },
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

    // If we have an id (came from server), delete remotely via GraphQL
    const id = (target as any).id;
    if (id) {
      this.apollo
        .mutate<{ deleteGrocery: boolean }>({
          mutation: DELETE_GROCERY_MUTATION,
          variables: { id },
        })
        .subscribe({
          error: () => {
            // Optional: rollback or toast
          },
        });
    }
  }

  /** Same signature: clear all */
  clear() {
    const prev = this.items;
    this.items = [];
    this.persist();

    // Attempt to clear server too, via GraphQL
    this.apollo
      .mutate<{ clearGrocery: boolean }>({
        mutation: CLEAR_GROCERY_MUTATION,
      })
      .subscribe({
        error: () => {
          // Optional: rollback local if needed
          this.items = prev;
          this.persist();
        },
      });
  }

  /**
   * NEW: Replace the grocery list with a generated list based on meal-plan recipes.
   * - Aggregates duplicate ingredients by name (case-insensitive).
   * - Best effort for qty:
   *    - if both are numbers -> sum
   *    - else -> keep as comma-separated text (e.g., "2, 1 can")
   * - Clears server list first, then re-adds items (simple and requirement-proof).
   */
  replaceWithGeneratedFromMealPlan(ingredients: Ingredient[]): void {
    const generated = this.aggregateIngredients(ingredients);

    // Replace locally immediately
    this.items = generated.map((it) => ({ ...it })); // no ids yet
    this.persist();

    // Replace remotely: clear then add all
    this.apollo
      .mutate<{ clearGrocery: boolean }>({
        mutation: CLEAR_GROCERY_MUTATION,
      })
      .subscribe({
        next: () => {
          // Add each generated item to server; we can reuse addMany for that,
          // but we don't want the optimistic prepend behavior, so we call mutations directly.
          generated.forEach((it) => {
            const input = {
              name: it.name,
              qty: it.qty != null ? String(it.qty) : '',
            };

            this.apollo
              .mutate<{ addGrocery: RawGroceryItem }>({
                mutation: ADD_GROCERY_MUTATION,
                variables: { input },
              })
              .subscribe({
                next: (result) => {
                  const created = result.data?.addGrocery;
                  if (!created) return;

                  const normalized = this.toIngredient(created);

                  // Replace matching local item (by name + qty string)
                  const idx = this.items.findIndex(
                    (x) =>
                      (x.name ?? '').toLowerCase().trim() ===
                        (it.name ?? '').toLowerCase().trim() &&
                      String(x.qty ?? '') === String(it.qty ?? '')
                  );

                  if (idx > -1) this.items[idx] = normalized;
                  else this.items = [normalized, ...this.items];

                  this.persist();
                },
                error: () => {
                  // optional: toast
                },
              });
          });
        },
        error: () => {
          // If server clear fails, we already updated local list.
          // That's acceptable for now; you can add a toast if you want.
        },
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

  private aggregateIngredients(input: Ingredient[]): Ingredient[] {
    const map = new Map<string, { name: string; qtyNum?: number; qtyText?: string }>();

    for (const it of input ?? []) {
      const nameRaw = (it?.name ?? '').trim();
      if (!nameRaw) continue;

      const key = nameRaw.toLowerCase();
      const existing = map.get(key) ?? { name: nameRaw };

      const nextQty = it.qty;

      // Try numeric merge
      const nextNum = typeof nextQty === 'number'
        ? nextQty
        : (typeof nextQty === 'string' ? Number(nextQty) : NaN);

      const nextIsNumeric = Number.isFinite(nextNum);

      if (nextIsNumeric) {
        existing.qtyNum = (existing.qtyNum ?? 0) + nextNum;
      } else if (nextQty != null && String(nextQty).trim() !== '') {
        const txt = String(nextQty).trim();
        existing.qtyText = existing.qtyText ? `${existing.qtyText}, ${txt}` : txt;
      }

      map.set(key, existing);
    }

    // Build final list
    const out: Ingredient[] = [];
    for (const v of map.values()) {
      if (v.qtyNum != null && Number.isFinite(v.qtyNum)) {
        out.push({ name: v.name, qty: v.qtyNum });
      } else if (v.qtyText) {
        out.push({ name: v.name, qty: v.qtyText });
      } else {
        out.push({ name: v.name });
      }
    }

    // Stable-ish ordering: alphabetic
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }
}
