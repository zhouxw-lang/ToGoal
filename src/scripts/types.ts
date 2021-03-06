import { API_TOKEN_KEY, FIRST_DAY_OF_WEEK_KEY, GOAL_KEY, RECORDED_TIME_KEY, WORKSPACE_ID_KEY } from './storage';

export type Order = 'asc' | 'desc';

export interface TableSortRow {
    project: string;
    goal: number;
    recordedTime: number;
    progress: number;
    remainingTime: number;
}

export type TableSortRowKey = keyof TableSortRow;

export type TrackingPeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface Options {
    [API_TOKEN_KEY]: string;
    [WORKSPACE_ID_KEY]: string;
    [FIRST_DAY_OF_WEEK_KEY]: string;
}

export interface ProjectStatus {
    [GOAL_KEY]?: string;
    [RECORDED_TIME_KEY]?: string;
}

export type ProjectStatusKey = keyof ProjectStatus;

export interface ProjectStatuses {
    [projectName: string]: ProjectStatus;
}

export interface ProjectSingleFieldStatuses {
    [projectName: string]: string;
}

export interface Customizations {
    onlyShowPrjWithGoals: boolean;
    order: Order;
    orderBy: TableSortRowKey;
    trackingPeriodType: TrackingPeriodType;
    trackingPeriodStartCustomValue: string;
    trackingPeriodEndCustomValue: string;
}
