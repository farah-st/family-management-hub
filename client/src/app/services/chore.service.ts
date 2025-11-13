import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { Chore } from '../models/chore.model';

type Raw = Chore & { _id?: string };
const KEY = 'fmh_chores_v1';

@Injectable({ providedIn: 'root' })
export class ChoreService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/chores`;

  private subject = new BehaviorSubject<Chore[]>(this.load());
  chores$ = this.subject.asObservable();

  constructor() {
    this.http.get<Raw[]>(this.base).pipe(
      map(list => list.map(this.normalize))
    ).subscribe({
      next: list => { if (list.length) { this.subject.next(list); this.save(list); } },
      error: () => { /* keep local */ }
    });
  }

  list(): Observable<Chore[]> { return this.chores$; }
  getById(id: string): Observable<Chore | null> {
    return this.list().pipe(map(xs => xs.find(x => x.id === id) ?? null));
  }

  create(body: Partial<Chore>): Observable<Chore> {
    return this.http.post<Raw>(this.base, body).pipe(
      map(this.normalize),
      tap(item => { const next = [item, ...this.subject.getValue()]; this.subject.next(next); this.save(next); })
    );
  }
  update(id: string, patch: Partial<Chore>): Observable<Chore> {
    return this.http.put<Raw>(`${this.base}/${id}`, patch).pipe(
      map(this.normalize),
      tap(item => { const next = this.subject.getValue().map(x => x.id === id ? item : x); this.subject.next(next); this.save(next); })
    );
  }
  remove(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(
      tap(() => { const next = this.subject.getValue().filter(x => x.id !== id); this.subject.next(next); this.save(next); })
    );
  }
  complete(id: string, memberId?: string) {
    return this.http.post<Raw>(`${this.base}/${id}/complete`, { memberId }).pipe(
      map(this.normalize),
      tap(item => { const next = this.subject.getValue().map(x => x.id === id ? item : x); this.subject.next(next); this.save(next); })
    );
  }

  private normalize = (r: Raw): Chore => ({ ...r, id: r._id ?? (r as any).id });
  private load(): Chore[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
  private save(v: Chore[]) { localStorage.setItem(KEY, JSON.stringify(v)); }
}
