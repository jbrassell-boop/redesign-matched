export interface DevListItem {
  toDoId: number;
  title: string;
  description: string | null;
  statusId: number;
  status: string;
  assignee: string | null;
  requestDate: string | null;
  completionDate: string | null;
  targetYear: number | null;
  targetQuarter: number | null;
  sortOrder: number;
}

export interface DevListStatus {
  statusId: number;
  status: string;
}

export interface DevListStats {
  total: number;
  pending: number;
  inProgress: number;
  awaiting: number;
  completed: number;
  review: number;
}

export interface DevListResponse {
  items: DevListItem[];
  totalCount: number;
}
