export type Priority = 'low' | 'med' | 'high';

export interface ChoreAssignment {
  memberId: string;
  dueDate?: string | null; 
  recurrence?: {
    freq: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    byDay?: number[];
    interval?: number;
  };
  points?: number;
}

export interface ChoreCompletion {
  on: string;  // ISO date string
  memberId?: string;
  paid?: boolean; // <= NEW: whether this completion has been paid out
}

// AssignedTo fields must be optional because server allows missing ones
export interface AssignedTo {
  name?: string;
  role?: string;
}

export interface Chore {
  id: string;
  title: string;
  notes?: string;

  priority: Priority;
  dueDate?: string | null;

  rewardAmount?: number | null;
  rewardCurrency?: string | null;

  assignedTo?: AssignedTo | null;

  assignments?: ChoreAssignment[];
  completed?: ChoreCompletion[];

  active: boolean;

  // Extras that exist in Mongo:
  assignee?: string | null;
  categoryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

