export type Priority = 'low' | 'med' | 'high';

export interface ChoreAssignment {
  memberId: string;
  dueDate?: string; // ISO
  recurrence?: { freq: 'DAILY' | 'WEEKLY' | 'MONTHLY'; byDay?: number[]; interval?: number };
  points?: number;
}

export interface ChoreCompletion {
  on: string;      // ISO
  memberId?: string;
}

export interface Chore {
  id: string;      // normalized from _id
  title: string;
  notes?: string;
  priority: Priority;

  // NEW: matches server's top-level dueDate field
  dueDate?: string | null;

  // Future: richer structure, still okay if backend doesn't send these yet
  assignments: ChoreAssignment[];
  completed: ChoreCompletion[];
  active: boolean;
}

