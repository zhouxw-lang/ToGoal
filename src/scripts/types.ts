export type Order = 'asc' | 'desc';

export interface TableSortRow {
    project: string;
    goal: number;
    recordedTime: number;
    progress: number;
    remainingTime: number;
}

export type TableSortRowKey = keyof TableSortRow;
