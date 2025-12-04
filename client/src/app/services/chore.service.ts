//******************************************
//* Imports
//******************************************
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { Chore } from '../models/chore.model';

type RawChore = Omit<Chore, 'id'> & { _id: string };
const KEY = 'fmh_chores_v1';

//******************************************
//* Service setup & constructor
//******************************************
@Injectable({ providedIn: 'root' })
export class ChoreService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/chores`;

  private subject = new BehaviorSubject<Chore[]>(this.load());
  readonly chores$ = this.subject.asObservable();

  constructor() {
    this.http
      .get<RawChore[]>(this.base)
      .pipe(map(list => list.map(raw => this.normalize(raw))))
      .subscribe({
        next: normalized => {
          // Server is source of truth when available
          this.subject.next(normalized);
          this.save(normalized);
        },
        error: () => {
          // Keep local cache if server fails
        },
      });
  }

  //******************************************
  //* Listing & getting a single chore
  //******************************************
  list(): Observable<Chore[]> {
    return this.chores$;
  }

  getById(id: string): Observable<Chore | null> {
    return this.list().pipe(map(xs => xs.find(x => x.id === id) ?? null));
  }

  // Alias used by ChoreDetailComponent
  get(id: string): Observable<Chore | null> {
    return this.getById(id);
  }

  //******************************************
  //* Creating a new chore
  //******************************************
  create(body: Partial<Chore>): Observable<Chore> {
    return this.http.post<RawChore>(this.base, body).pipe(
      map(raw => this.normalize(raw)),
      tap(item => {
        const next = [item, ...this.subject.getValue()];
        this.subject.next(next);
        this.save(next);
      })
    );
  }

  //******************************************
  //* Updating a chore
  //******************************************
  update(id: string, patch: Partial<Chore>): Observable<Chore> {
    return this.http.put<RawChore>(`${this.base}/${id}`, patch).pipe(
      map(raw => this.normalize(raw)),
      tap(item => {
        const next = this.subject
          .getValue()
          .map(x => (x.id === id ? item : x));
        this.subject.next(next);
        this.save(next);
      })
    );
  }

  //******************************************
  //* Deleting a chore
  //******************************************
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => {
        const next = this.subject.getValue().filter(x => x.id !== id);
        this.subject.next(next);
        this.save(next);
      })
    );
  }

  //******************************************
  //* Completing a chore
  //******************************************
  complete(id: string, memberId?: string): Observable<Chore> {
    return this.http
      .post<RawChore>(`${this.base}/${id}/complete`, { memberId })
      .pipe(
        map(raw => this.normalize(raw)),
        tap(item => {
          const next = this.subject
            .getValue()
            .map(x => (x.id === id ? item : x));
          this.subject.next(next);
          this.save(next);
        })
      );
  }

  //******************************************
  //* Normalization & local cache
  //******************************************
  private normalize(raw: RawChore): Chore {
    return {
      id: raw._id,
      title: raw.title,
      notes: raw.notes,
      priority: raw.priority,
      dueDate: raw.dueDate ?? null,

      // Reward fields
      rewardAmount: raw.rewardAmount ?? null,
      rewardCurrency: raw.rewardCurrency ?? 'USD',

      // Assignment info
      assignedTo: raw.assignedTo ?? null,
      assignments: raw.assignments ?? [],
      completed: raw.completed ?? [],

      active: raw.active,

      // Extra backend-only fields
      assignee: (raw as any).assignee ?? null,
      categoryId: (raw as any).categoryId ?? null,
      createdAt: (raw as any).createdAt,
      updatedAt: (raw as any).updatedAt,
    };
  }

  private load(): Chore[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(v: Chore[]): void {
    localStorage.setItem(KEY, JSON.stringify(v));
  }
}
