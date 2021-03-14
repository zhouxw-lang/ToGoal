import { API_TOKEN_KEY, FIRST_DAY_OF_WEEK_KEY, loadOptions, WORKSPACE_ID_KEY } from './storage';
import { ProjectSingleFieldStatuses, Workspace } from './types';

export async function retrieveWorkspaces(apiToken: string): Promise<Workspace[]> {
    let response;
    try {
        response = await fetch(`https://api.track.toggl.com/api/v8/workspaces`, {
            method: 'GET',
            headers: {
                Authorization: 'Basic ' + btoa(`${apiToken}:api_token`),
            },
        });
    } catch (e) {
        throw new Error(`Failed to retrieve workspaces from server: ${e}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to retrieve workspaces, server response status: ${response.status}`);
    }

    const json = (await response.json()) as Array<Record<string, unknown>>;
    if (!json) {
        return [];
    }
    try {
        return json.map(
            (elem: { id: number; name: string }) => ({ id: elem.id.toString(), name: elem.name } as Workspace)
        );
    } catch (e) {
        throw new Error(`Failed to parse workspaces: ${e}`);
    }
}

export async function retrieveProjects(): Promise<string[]> {
    const options = await loadOptions();
    if (!options.hasOwnProperty(API_TOKEN_KEY) || !options.hasOwnProperty(WORKSPACE_ID_KEY)) {
        throw new Error('API Token or workspace ID is empty. Please set them in options.');
    }

    let response;
    try {
        response = await fetch(`https://api.track.toggl.com/api/v8/workspaces/${options[WORKSPACE_ID_KEY]}/projects`, {
            method: 'GET',
            headers: {
                Authorization: 'Basic ' + btoa(`${options[API_TOKEN_KEY]}:api_token`),
            },
        });
    } catch (e) {
        throw new Error(`Failed to retrieve projects from server: ${e}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to retrieve projects, server response status: ${response.status}`);
    }

    const json = (await response.json()) as Array<Record<string, unknown>>;
    if (!json) {
        return [];
    }
    try {
        return json.map((elem: { name: string }) => elem.name);
    } catch (e) {
        throw new Error(`Failed to parse projects: ${e}`);
    }
}

export async function retrieveRecordedTimes(
    sinceDateISOStr: string,
    untilDateISOStr: string
): Promise<ProjectSingleFieldStatuses> {
    const options = await loadOptions();
    if (
        !options.hasOwnProperty(API_TOKEN_KEY) ||
        !options.hasOwnProperty(WORKSPACE_ID_KEY) ||
        !options.hasOwnProperty(FIRST_DAY_OF_WEEK_KEY)
    ) {
        throw new Error('API Token, workspace ID or first day of the week is empty. Please set them in options.');
    }

    let response;
    try {
        response = await fetch(
            `https://api.track.toggl.com/reports/api/v2/summary?user_agent=ToGoal&workspace_id=${options[WORKSPACE_ID_KEY]}&since=${sinceDateISOStr}&until=${untilDateISOStr}`,
            {
                method: 'GET',
                headers: {
                    Authorization: 'Basic ' + btoa(`${options[API_TOKEN_KEY]}:api_token`),
                },
            }
        );
    } catch (e) {
        throw new Error(`Failed to retrieve recorded times from server: ${e}`);
    }

    if (!response.ok) {
        throw new Error(`Failed to retrieve recorded times, server response status: ${response.status}`);
    }

    const json = (await response.json()) as { data: Array<Record<string, unknown>> };
    try {
        const dataArr = json.data;
        return dataArr.reduce(
            (result: ProjectSingleFieldStatuses, dataObj: { title: { project: string }; time: number }) => {
                if (dataObj.title.project) {
                    // ignore time recordings without project
                    result[dataObj.title.project] = (dataObj.time / 3600000.0).toFixed(2); // time in hours
                }
                return result;
            },
            {}
        ) as ProjectSingleFieldStatuses;
    } catch (e) {
        throw new Error(`Failed to parse recorded times: ${e}`);
    }
}
