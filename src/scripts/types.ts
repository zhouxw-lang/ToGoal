import {
    API_TOKEN_KEY,
    FIRST_DAY_OF_WEEK_KEY,
    GOAL_KEY,
    RECORDED_TIME_KEY,
    RETRIEVED_WORKSPACES_KEY,
    WORKSPACE_ID_KEY,
} from './storage';

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
    [RETRIEVED_WORKSPACES_KEY]: Workspace[];
}

export interface Workspace {
    id: string;
    name: string;
}

export interface ProjectStatusForSingleTrackingPeriod {
    [GOAL_KEY]?: string; // Existing in version <=2.0.0, might delete in the future (202103)
    [RECORDED_TIME_KEY]?: string; // Existing in version <=2.0.0, might delete in the future (202103)
}

export interface ProjectStatus extends ProjectStatusForSingleTrackingPeriod {
    daily?: ProjectStatusForSingleTrackingPeriod; // new field from 2.1.0 (202103)
    weekly?: ProjectStatusForSingleTrackingPeriod; // new field from 2.1.0 (202103)
    monthly?: ProjectStatusForSingleTrackingPeriod; // new field from 2.1.0 (202103)
    custom?: ProjectStatusForSingleTrackingPeriod; // new field from 2.1.0 (202103)
}

export type ProjectStatusKey = keyof ProjectStatusForSingleTrackingPeriod;

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
