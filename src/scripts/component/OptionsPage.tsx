import * as React from 'react';

import {
    API_TOKEN_KEY,
    FIRST_DAY_OF_WEEK_KEY,
    loadOptions,
    RETRIEVED_WORKSPACES_KEY,
    storeOptions,
    WORKSPACE_ID_KEY,
} from '../storage';

import {
    Button,
    Container,
    FormControl,
    FormHelperText,
    InputLabel,
    MenuItem,
    Select,
    TextField,
} from '@material-ui/core';
// @ts-ignore
import { Alert } from '@material-ui/lab';
import { Options, Workspace } from '../types';
import { retrieveWorkspaces } from '../togglTrackApi';

interface State extends Options {
    msgVisible: boolean;
    msgType: 'success' | 'info' | 'warning' | 'error';
    msgContent: string;
}

export default class OptionsPage extends React.Component<Readonly<Record<string, never>>, State> {
    constructor(props: Readonly<Record<string, never>>) {
        super(props);

        this.state = {
            [API_TOKEN_KEY]: '',
            [WORKSPACE_ID_KEY]: '',
            [FIRST_DAY_OF_WEEK_KEY]: '0',
            [RETRIEVED_WORKSPACES_KEY]: [],
            msgVisible: false,
            msgType: 'success',
            msgContent: '',
        };
    }

    private saveOptions = async () => {
        await storeOptions({
            [API_TOKEN_KEY]: this.state[API_TOKEN_KEY],
            [WORKSPACE_ID_KEY]: this.state[WORKSPACE_ID_KEY],
            [FIRST_DAY_OF_WEEK_KEY]: this.state[FIRST_DAY_OF_WEEK_KEY],
            [RETRIEVED_WORKSPACES_KEY]: this.state[RETRIEVED_WORKSPACES_KEY],
        });
        await this.showSuccessMessage('Options saved.');
    };

    private restoreOptions = async () => {
        const options = await loadOptions();
        await this.updateState({ ...options });
    };

    private handleApiTokenChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const apiToken = event.target.value;
        await this.hideMessage();
        await this.updateState({ [API_TOKEN_KEY]: apiToken, [WORKSPACE_ID_KEY]: '' });
        await this.retrieveWorkspaces(apiToken, true);
    };

    private manualUpdateWorkspaces = async () => {
        await this.hideMessage();
        await this.retrieveWorkspaces(this.state[API_TOKEN_KEY], false);
    };

    private retrieveWorkspaces = async (apiToken: string, noAlert: boolean) => {
        try {
            const retrievedWorkspaces: Workspace[] = await retrieveWorkspaces(apiToken);
            let workspaceId;

            const workspaceIds = retrievedWorkspaces.map((w) => w.id);
            if (retrievedWorkspaces.length === 0) {
                workspaceId = '';
            } else if (workspaceIds.includes(this.state[WORKSPACE_ID_KEY])) {
                workspaceId = this.state[WORKSPACE_ID_KEY];
            } else {
                workspaceId = retrievedWorkspaces[0].id;
            }
            await this.updateState({
                [RETRIEVED_WORKSPACES_KEY]: retrievedWorkspaces,
                [WORKSPACE_ID_KEY]: workspaceId,
            });
        } catch (e) {
            if (e instanceof Error) {
                await this.showWarningMessage(e.message);
            } else if (!noAlert) {
                alert(e);
            }
        }
    };

    private showSuccessMessage = async (msgContent: string) => {
        await this.updateState({ msgVisible: true, msgType: 'success', msgContent });
        setTimeout(() => {
            this.setState({ msgVisible: false });
        }, 1500);
    };

    private showWarningMessage = async (msgContent: string) => {
        await this.updateState({ msgVisible: true, msgType: 'warning', msgContent });
    };

    private hideMessage = async () => {
        await this.updateState({ msgVisible: false });
    };

    private updateState = async <K extends keyof State>(newPartialState: Pick<State, K>): Promise<void> => {
        return new Promise((resolve) => {
            this.setState(newPartialState, () => resolve());
        });
    };

    async componentDidMount(): Promise<void> {
        try {
            await this.restoreOptions();
        } catch (e) {
            // ignore
        }
    }

    render(): JSX.Element {
        return (
            <Container maxWidth="sm">
                <p />
                <h2>ToGoal Options</h2>
                <p />
                <TextField
                    fullWidth
                    margin="normal"
                    id="api-token-input"
                    label="Toggl Track API Token:"
                    placeholder="Enter your Toggl Track API Token"
                    name={API_TOKEN_KEY}
                    value={this.state[API_TOKEN_KEY]}
                    onChange={this.handleApiTokenChange}
                />

                <FormControl fullWidth margin="normal">
                    <InputLabel shrink htmlFor="select-multiple-native">
                        Toggl Track Workspace
                    </InputLabel>
                    <Select
                        native
                        name={WORKSPACE_ID_KEY}
                        value={this.state[WORKSPACE_ID_KEY]}
                        onChange={(event) =>
                            this.updateState({
                                [WORKSPACE_ID_KEY]: event.target.value as string,
                            })
                        }
                    >
                        {this.state[RETRIEVED_WORKSPACES_KEY] &&
                            this.state[RETRIEVED_WORKSPACES_KEY].map((workspace) => (
                                <option key={workspace.id} value={workspace.id}>
                                    {workspace.name}
                                </option>
                            ))}
                    </Select>
                    <FormHelperText>
                        Workspaces list is automatically updated when API Token is inputted{' '}
                        <a
                            href="javascript:void(0)"
                            onClick={this.manualUpdateWorkspaces}
                            style={{ textDecoration: 'none', color: 'blue' }}
                        >
                            (Manually update)
                        </a>
                    </FormHelperText>
                </FormControl>

                <FormControl fullWidth margin="normal">
                    <InputLabel id="first-day-of-week-input-label">First day of the week:</InputLabel>
                    <Select
                        labelId="first-day-of-week-input-label"
                        id="first-day-of-week-input"
                        name={FIRST_DAY_OF_WEEK_KEY}
                        value={this.state[FIRST_DAY_OF_WEEK_KEY]}
                        onChange={(event) =>
                            this.updateState({ [FIRST_DAY_OF_WEEK_KEY]: event.target.value as string })
                        }
                    >
                        <MenuItem value="0">Sunday</MenuItem>
                        <MenuItem value="1">Monday</MenuItem>
                        <MenuItem value="2">Tuesday</MenuItem>
                        <MenuItem value="3">Wednesday</MenuItem>
                        <MenuItem value="4">Thursday</MenuItem>
                        <MenuItem value="5">Friday</MenuItem>
                        <MenuItem value="6">Saturday</MenuItem>
                    </Select>
                </FormControl>
                <p />
                <Button variant="contained" color="primary" disableElevation onClick={this.saveOptions}>
                    Save
                </Button>
                <p />
                {this.state.msgVisible && <Alert severity={this.state.msgType}>{this.state.msgContent}</Alert>}

                <h4>References:</h4>
                <h5>How to find API Token</h5>
                <a target="_blank" href="https://support.toggl.com/en/articles/3116844-where-is-my-api-token-located">
                    Where is my API Token located?
                </a>
            </Container>
        );
    }
}
