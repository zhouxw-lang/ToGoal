import { Order, TableSortRowKey } from './types';

const MODEL_ROOT_KEY = 'toGoalModel';

export const GOAL_KEY = 'goal';
export const RECORDED_TIME_KEY = 'recordedTime';

const OPTIONS_ROOT_KEY = 'options';

export const API_TOKEN_KEY = 'apiToken';
export const WORKSPACE_ID_KEY = 'workspaceId';
export const FIRST_DAY_OF_WEEK_KEY = 'firstDayOfWeek';

const CUSTOMIZATIONS_ROOT_KEY = 'customizations';

export interface Options {
    [API_TOKEN_KEY]: string;
    [WORKSPACE_ID_KEY]: string;
    [FIRST_DAY_OF_WEEK_KEY]: string;
}

export type OptionsKey = keyof Options;

interface ProjectStatus {
    [GOAL_KEY]?: string;
    [RECORDED_TIME_KEY]?: string;
}

type ProjectStatusKey = keyof ProjectStatus;

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
}

const defaultCustomizations: Customizations = {
    onlyShowPrjWithGoals: false,
    order: 'asc',
    orderBy: 'project',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sample_donotuse = {
    toGoalModel: {
        project1: {
            goal: 550,
            recordedTime: 210,
        },
        project2: {
            goal: 550,
            recordedTime: 210,
        },
    },
    options: {
        apiToken: 'aaaaaaaaaaaaaaaaaaaaaaaaaa',
        workspaceId: 123456,
    },
};

const storage = chrome.storage.sync;

export async function loadOptions(): Promise<Options> {
    return new Promise((resolve, reject) => {
        storage.get(OPTIONS_ROOT_KEY, (optionsKeyVal) => {
            if (optionsKeyVal && optionsKeyVal[OPTIONS_ROOT_KEY]) {
                resolve(optionsKeyVal[OPTIONS_ROOT_KEY]);
            } else {
                reject('There are no options stored. Please configure this extension on options page.');
            }
        });
    });
}

export async function storeOptions(options: Options): Promise<void> {
    return new Promise((resolve) => {
        storage.set({ [OPTIONS_ROOT_KEY]: options }, () => resolve());
    });
}

export async function loadCustomizations(): Promise<Customizations> {
    return new Promise((resolve) => {
        storage.get(CUSTOMIZATIONS_ROOT_KEY, (customizationsKeyVal) => {
            if (customizationsKeyVal && customizationsKeyVal[CUSTOMIZATIONS_ROOT_KEY]) {
                resolve(customizationsKeyVal[CUSTOMIZATIONS_ROOT_KEY]);
            } else {
                resolve(defaultCustomizations);
            }
        });
    });
}

export async function storeCustomizations(partialCustomizations: Partial<Customizations>): Promise<void> {
    const currentCustomizations = await loadCustomizations();
    return new Promise((resolve) => {
        storage.set({ [CUSTOMIZATIONS_ROOT_KEY]: { ...currentCustomizations, ...partialCustomizations } }, () =>
            resolve()
        );
    });
}

export async function getProjectNames(): Promise<string[]> {
    return new Promise((resolve) => {
        storage.get(MODEL_ROOT_KEY, (rootKeyVal) => {
            if (rootKeyVal && rootKeyVal[MODEL_ROOT_KEY]) {
                resolve(Object.keys(rootKeyVal[MODEL_ROOT_KEY]));
            } else {
                resolve([]);
            }
        });
    });
}

export async function getProjectStatuses(): Promise<ProjectStatuses> {
    return new Promise((resolve) => {
        storage.get(MODEL_ROOT_KEY, (rootKeyVal) => {
            if (rootKeyVal && rootKeyVal[MODEL_ROOT_KEY]) {
                resolve(rootKeyVal[MODEL_ROOT_KEY]);
            } else {
                resolve({});
            }
        });
    });
}

export async function addProjects(
    newProjectNames: string[],
    removeUnused: boolean,
    unusedProjectNames: string[]
): Promise<void> {
    return new Promise((resolve) => {
        storage.get(MODEL_ROOT_KEY, (rootKeyVal) => {
            const rootObj: ProjectStatuses =
                rootKeyVal && rootKeyVal[MODEL_ROOT_KEY] ? (rootKeyVal[MODEL_ROOT_KEY] as ProjectStatuses) : {};

            if (removeUnused) {
                unusedProjectNames.forEach((projectName) => {
                    delete rootObj[projectName];
                });
            }

            newProjectNames.forEach((projectName) => {
                rootObj[projectName] = {};
            });

            storage.set({ [MODEL_ROOT_KEY]: rootObj }, () => resolve());
        });
    });
}

export async function updateProjectGoals(
    projectGoals: ProjectSingleFieldStatuses /* map from project name to goal in hours */
): Promise<void> {
    return innerUpdateProjects(projectGoals, GOAL_KEY);
}

export async function updateProjectRecordedTimes(
    projectRecordedTimes: ProjectSingleFieldStatuses /* map from project name to recorded time in hours */
): Promise<void> {
    return innerUpdateProjects(projectRecordedTimes, RECORDED_TIME_KEY);
}

async function innerUpdateProjects(
    projectDataMap: ProjectSingleFieldStatuses,
    fieldKey: ProjectStatusKey
): Promise<void> {
    return new Promise((resolve) => {
        storage.get(MODEL_ROOT_KEY, (rootKeyVal) => {
            const rootObj: ProjectStatuses =
                rootKeyVal && rootKeyVal[MODEL_ROOT_KEY] ? (rootKeyVal[MODEL_ROOT_KEY] as ProjectStatuses) : {};

            Object.keys(rootObj).forEach((projectName) => {
                if (projectDataMap[projectName]) {
                    rootObj[projectName][fieldKey] = projectDataMap[projectName];
                } else {
                    rootObj[projectName][fieldKey] = '';
                }
            });

            storage.set({ [MODEL_ROOT_KEY]: rootObj }, () => resolve());
        });
    });
}
