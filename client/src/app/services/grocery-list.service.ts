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
          // You could log or show a toast here if you want
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

    // Sync to server via GraphQL (one mutation per item, same as old REST loop)
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
            // Optional: rollback or show a toast
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

