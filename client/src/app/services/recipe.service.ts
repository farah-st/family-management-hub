import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Recipe } from '../models/recipe.model';

const KEY = 'fmh_recipes_v2';
type RawRecipe = Recipe & { _id?: string };

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/recipes`;

  private recipesSubject = new BehaviorSubject<Recipe[]>(this.load());
  public readonly recipes$ = this.recipesSubject.asObservable();

  constructor() {
    // Prime cache from server; keep local data if it fails.
    this.http.get<RawRecipe[]>(this.base).pipe(
      map(arr => arr.map(this.normalizeId))
    ).subscribe({
      next: normalized => {
        this.recipesSubject.next(normalized);
        this.save(normalized);
      },
      error: () => { /* optional log */ }
    });
  }

  /** Observable list */
  list(): Observable<Recipe[]> { return this.recipes$; }

  /** Synchronous snapshot lookup from cache (used by edit form prefill) */
  get(id: string): Recipe | undefined {
    return this.recipesSubject.getValue().find(r => r.id === id);
  }

  /** Create on server, update cache, and return created item */
  create(recipe: Partial<Recipe>): Observable<Recipe> {
    // Do NOT send a client-generated id; server will create it
    const { id, ...body } = recipe as Recipe;
    return this.http.post<RawRecipe>(this.base, body).pipe(
      map(this.normalizeId),
      tap(created => {
        const next = [created, ...this.recipesSubject.getValue()];
        this.recipesSubject.next(next);
        this.save(next);
      })
    );
  }

  /** Update on server, merge into cache, and return updated item */
  update(id: string, patch: Partial<Recipe>): Observable<Recipe> {
    return this.http.put<RawRecipe>(`${this.base}/${id}`, patch).pipe(
      map(this.normalizeId),
      tap(updated => {
        const next = this.recipesSubject.getValue().map(x =>
          x.id === id ? { ...x, ...updated } : x
        );
        this.recipesSubject.next(next);
        this.save(next);
      })
    );
  }

  /** Delete on server and remove from cache */
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => {
        const next = this.recipesSubject.getValue().filter(r => r.id !== id);
        this.recipesSubject.next(next);
        this.save(next);
      })
    );
  }

  // ---- helpers ----
  private normalizeId = (r: RawRecipe): Recipe =>
    ({ ...r, id: r._id ?? (r as any).id });

  private load(): Recipe[] {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch { return []; }
  }
  private save(recipes: Recipe[]) {
    localStorage.setItem(KEY, JSON.stringify(recipes));
  }
}
