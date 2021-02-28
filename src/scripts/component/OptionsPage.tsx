import * as React from 'react';

import { API_TOKEN_KEY, FIRST_DAY_OF_WEEK_KEY, loadOptions, storeOptions, WORKSPACE_ID_KEY } from '../storage';

import { Button, Container, FormControl, InputLabel, MenuItem, Select, TextField } from '@material-ui/core';
// @ts-ignore
import { Alert } from '@material-ui/lab';
import { Options } from '../types';

interface State {
    options: Options;
    msgVisible: boolean;
}

export default class OptionsPage extends React.Component<Readonly<Record<string, never>>, State> {
    constructor(props: Readonly<Record<string, never>>) {
        super(props);

        this.state = {
            options: {
                [API_TOKEN_KEY]: '',
                [WORKSPACE_ID_KEY]: '',
                [FIRST_DAY_OF_WEEK_KEY]: '0',
            },
            msgVisible: false,
        };
    }

    private saveOptions = async () => {
        await storeOptions(this.state.options);
        this.setState({ msgVisible: true }, () => {
            setTimeout(() => {
                this.setState({ msgVisible: false });
            }, 750);
        });
    };

    private restoreOptions = async () => {
        const options = await loadOptions();
        this.setState({ options: options });
    };

    private handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState((prevState) => ({
            options: {
                ...prevState.options,
                [event.target.name]: event.target.value,
            },
        }));
    };

    componentDidMount(): void {
        void this.restoreOptions();
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
                    label="API Token:"
                    placeholder="Enter your Toggl Track API Token"
                    name={API_TOKEN_KEY}
                    value={this.state.options.apiToken}
                    onChange={this.handleInputChange}
                />

                <TextField
                    fullWidth
                    margin="normal"
                    id="workspace-id-input"
                    label="Workspace ID:"
                    placeholder="Enter Toggl Track workspace ID"
                    name={WORKSPACE_ID_KEY}
                    value={this.state.options.workspaceId}
                    onChange={this.handleInputChange}
                />

                <FormControl fullWidth margin="normal">
                    <InputLabel id="first-day-of-week-input-label">First day of the week:</InputLabel>
                    <Select
                        labelId="first-day-of-week-input-label"
                        id="first-day-of-week-input"
                        name={FIRST_DAY_OF_WEEK_KEY}
                        value={this.state.options.firstDayOfWeek}
                        onChange={this.handleInputChange}
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
                {this.state.msgVisible && <Alert severity="success">Options saved.</Alert>}

                <h4>References:</h4>
                <h5>How to find API Token</h5>
                <a target="_blank" href="https://support.toggl.com/en/articles/3116844-where-is-my-api-token-located">
                    Where is my API Token located?
                </a>
                <h5>How to find workspace ID</h5>
                <p>
                    Go to{' '}
                    <a target="_blank" href="https://track.toggl.com/projects">
                        Toggl Track Project list page
                    </a>{' '}
                    (log in if you have not), and look at the URL in the address bar. The integer in the URL is the
                    workspace ID, e.g. <code>https://track.toggl.com/projects/&lt;workspace ID&gt;/list</code>
                </p>
            </Container>
        );
    }
}
