import * as React from 'react';
import * as Storage from '../storage';
import {
    Customizations,
    Order,
    ProjectSingleFieldStatuses,
    ProjectStatuses,
    TableSortRowKey,
    TrackingPeriodType,
} from '../types';
import { retrieveProjects, retrieveRecordedTimes } from '../togglTrackApi';
import PopupPage from './PopupPage';
import { formatDate, getMonthlySinceUntilDates, getWeeklySinceUntilDates } from '../utils';
import { FIRST_DAY_OF_WEEK_KEY, loadOptions } from '../storage';
import dayjs from 'dayjs';

interface State extends Customizations {
    projects: ProjectStatuses;
    projectInputtedGoals: Record<string, string>;
    msgVisible: boolean;
    msgType: 'success' | 'info' | 'warning' | 'error';
    msgContent: string;
    trackingPeriodStart: Date;
    trackingPeriodEnd: Date;
    trackingPeriodStartCustomValue: string;
    trackingPeriodEndCustomValue: string;
    optionsMissing: boolean;
}

class PopupPageContainer extends React.Component<Readonly<Record<string, never>>, State> {
    constructor(props: Readonly<Record<string, never>>) {
        super(props);

        const now = new Date();
        this.state = {
            projects: {},
            projectInputtedGoals: {},
            onlyShowPrjWithGoals: false,
            msgVisible: false,
            msgContent: '',
            order: 'asc',
            orderBy: 'project',
            trackingPeriodType: 'weekly',
            trackingPeriodStart: now,
            trackingPeriodEnd: now,
            trackingPeriodStartCustomValue: formatDate(now),
            trackingPeriodEndCustomValue: formatDate(now),
            optionsMissing: false,
        } as State;
    }

    private handleRequestSort = (event: React.MouseEvent<unknown>, property: TableSortRowKey) => {
        this.setState((prevState) => {
            const isAsc = prevState.orderBy === property && prevState.order === 'asc';

            const newPartialState = {
                order: (isAsc ? 'desc' : 'asc') as Order,
                orderBy: property,
            };

            // persist to Chrome storage
            void Storage.storeCustomizations(newPartialState);

            return newPartialState;
        });
    };

    private handleUpdateRecordedTimes = async (silent: boolean) => {
        try {
            await this.innerUpdateProjects();
            await this.innerUpdateRecordedTimes();
            await this.updateProjectStatusesView();
            if (!silent) {
                await this.showSuccessMessage('Updates pulled from Toggl Track!');
            }
        } catch (e) {
            if (!silent) {
                alert(e);
            }
        }
    };

    private innerUpdateRecordedTimes = async () => {
        const [recordedTimes, storedNames] = await Promise.all([
            retrieveRecordedTimes(formatDate(this.state.trackingPeriodStart), formatDate(this.state.trackingPeriodEnd)),
            Storage.getProjectNames(),
        ]);
        const projectRecordedTimes: ProjectSingleFieldStatuses = {};
        for (const [projectName, hours] of Object.entries(recordedTimes)) {
            if (storedNames.includes(projectName)) {
                projectRecordedTimes[projectName] = hours;
            }
        }
        await Storage.updateProjectRecordedTimes(projectRecordedTimes);
    };

    private async innerUpdateProjects() {
        const [currNames, storedNames] = await Promise.all([retrieveProjects(), Storage.getProjectNames()]);

        const newNames = currNames.filter((name) => !storedNames.includes(name));

        let removeUnused = false;
        const unusedNames = storedNames.filter((name) => !currNames.includes(name));
        if (unusedNames.length !== 0) {
            const msg = 'The following projects are unused, do you want to remove them?\n\n' + unusedNames.join('\n');
            if (confirm(msg)) {
                removeUnused = true;
            }
        }
        await Storage.addProjects(newNames, removeUnused, unusedNames);
    }

    private handleSaveGoals = async (silent: boolean) => {
        return await this.innerHandleSaveGoals(silent, this.state.projects);
    };

    private innerHandleSaveGoals = async (silent: boolean, projects: ProjectStatuses) => {
        try {
            const storedNames = await Storage.getProjectNames();
            const projectGoals: ProjectSingleFieldStatuses = {};
            storedNames.forEach((projectName) => {
                const stateGoalValue = projects[projectName].goal;
                const goalFloat = parseFloat(stateGoalValue);
                projectGoals[projectName] = isNaN(goalFloat) || goalFloat <= 0.0 ? '' : stateGoalValue;
            });
            await Storage.updateProjectGoals(projectGoals);
            await this.updateProjectStatusesView();
            if (!silent) {
                await this.showSuccessMessage('Goals saved!');
            }
        } catch (e) {
            if (!silent) {
                alert(e);
            }
        }
    };

    private static handleOpenInNewTab = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    };

    private handleOnlyShowPrjWithGoalsChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.checked;
        await this.updateState({ onlyShowPrjWithGoals: newValue });

        // persist to Chrome storage
        await Storage.storeCustomizations({ onlyShowPrjWithGoals: newValue });
    };

    private handleTrackingPeriodStartCustomValueChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        await this.updateState({ trackingPeriodStartCustomValue: newValue });

        // persist to Chrome storage
        await Storage.storeCustomizations({ trackingPeriodStartCustomValue: newValue });

        await this.updateTrackingPeriodDates();
        await this.handleUpdateRecordedTimes(true);
    };

    private handleTrackingPeriodEndCustomValueChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value;
        await this.updateState({ trackingPeriodEndCustomValue: newValue });

        // persist to Chrome storage
        await Storage.storeCustomizations({ trackingPeriodEndCustomValue: newValue });

        await this.updateTrackingPeriodDates();
        await this.handleUpdateRecordedTimes(true);
    };

    private handleTrackingPeriodTypeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value as TrackingPeriodType;
        await this.updateState({ trackingPeriodType: newValue });

        // persist to Chrome storage
        await Storage.storeCustomizations({ trackingPeriodType: newValue });

        await this.updateTrackingPeriodDates();
        await this.handleUpdateRecordedTimes(true);
    };

    private handleGoalInputChange = async (event: React.ChangeEvent<HTMLInputElement>, namePrefix: string) => {
        if (event.target.name.startsWith(namePrefix)) {
            const projectName = event.target.name.substring(namePrefix.length);
            const projectInputtedGoals = { ...this.state.projectInputtedGoals };
            projectInputtedGoals[projectName] = event.target.value;
            await this.updateState({ projectInputtedGoals });
        }
    };

    private handleGoalInputBlur = async () => {
        const projects = { ...this.state.projects };
        const projectInputtedGoals = this.state.projectInputtedGoals;
        Object.keys(projectInputtedGoals).forEach((projectName) => {
            if (projects.hasOwnProperty(projectName)) {
                projects[projectName].goal = projectInputtedGoals[projectName];
            }
        });

        await this.innerHandleSaveGoals(true, projects);
        await this.updateState({ projectInputtedGoals: {} });
    };

    private updateState = async <K extends keyof State>(newPartialState: Pick<State, K>): Promise<void> => {
        return new Promise((resolve) => {
            this.setState(newPartialState, () => resolve());
        });
    };

    private updateTrackingPeriodDates = async (): Promise<void> => {
        let trackingPeriodStart: Date;
        let trackingPeriodEnd: Date;
        const today = new Date();
        await this.hideMessage();
        if (this.state.trackingPeriodType === 'weekly') {
            let firstDayOfWeek;
            try {
                const options = await loadOptions();
                firstDayOfWeek = options.hasOwnProperty(FIRST_DAY_OF_WEEK_KEY) ? options[FIRST_DAY_OF_WEEK_KEY] : '0';
            } catch (e) {
                firstDayOfWeek = '0';
            }

            [trackingPeriodStart, trackingPeriodEnd] = getWeeklySinceUntilDates(firstDayOfWeek);
        } else if (this.state.trackingPeriodType === 'monthly') {
            [trackingPeriodStart, trackingPeriodEnd] = getMonthlySinceUntilDates();
        } else if (this.state.trackingPeriodType === 'daily') {
            trackingPeriodStart = today;
            trackingPeriodEnd = today;
        } else if (this.state.trackingPeriodType === 'custom') {
            trackingPeriodStart = new Date(this.state.trackingPeriodStartCustomValue);
            if (isNaN(trackingPeriodStart.getTime())) {
                trackingPeriodStart = today;
            }
            trackingPeriodEnd = new Date(this.state.trackingPeriodEndCustomValue);
            if (isNaN(trackingPeriodEnd.getTime())) {
                trackingPeriodEnd = today;
            }

            if (dayjs(trackingPeriodStart).isAfter(trackingPeriodEnd)) {
                await this.showWarningMessage('Invalid tracking period: start date is after end date');
            } else if (dayjs(trackingPeriodEnd).diff(trackingPeriodStart, 'year') > 0) {
                await this.showWarningMessage('Invalid tracking period: longer than one year');
            }
        } else {
            trackingPeriodStart = new Date();
            trackingPeriodEnd = new Date();
        }

        await this.updateState({ trackingPeriodStart, trackingPeriodEnd });
    };

    private updateProjectStatusesView = async (): Promise<void> => {
        const projects = await Storage.getProjectStatuses();
        await this.updateState({ projects: projects });
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

    async componentDidMount(): Promise<void> {
        await this.checkOptionsMissing();
        await this.setStateCustomizations();

        await this.updateTrackingPeriodDates();

        await this.updateProjectStatusesView();
        await this.handleUpdateRecordedTimes(true);
    }

    private setStateCustomizations = async (): Promise<void> => {
        const customizations = await Storage.loadCustomizations();
        await this.updateState(customizations);
    };

    private checkOptionsMissing = async (): Promise<void> => {
        try {
            await loadOptions();
        } catch (e) {
            await this.updateState({ optionsMissing: true });
        }
    };

    render(): JSX.Element {
        return (
            <PopupPage
                projects={this.state.projects}
                projectInputtedGoals={this.state.projectInputtedGoals}
                onlyShowPrjWithGoals={this.state.onlyShowPrjWithGoals}
                msgVisible={this.state.msgVisible}
                msgType={this.state.msgType}
                msgContent={this.state.msgContent}
                order={this.state.order}
                orderBy={this.state.orderBy}
                trackingPeriodType={this.state.trackingPeriodType}
                trackingPeriodStart={this.state.trackingPeriodStart}
                trackingPeriodEnd={this.state.trackingPeriodEnd}
                trackingPeriodStartCustomValue={this.state.trackingPeriodStartCustomValue}
                trackingPeriodEndCustomValue={this.state.trackingPeriodEndCustomValue}
                optionsMissing={this.state.optionsMissing}
                handleUpdateRecordedTimes={() => this.handleUpdateRecordedTimes(false)}
                handleGoalInputChange={this.handleGoalInputChange}
                handleGoalInputBlur={this.handleGoalInputBlur}
                handleSaveGoals={() => this.handleSaveGoals(false)}
                handleOpenInNewTab={PopupPageContainer.handleOpenInNewTab}
                handleRequestSort={this.handleRequestSort}
                handleOnlyShowPrjWithGoalsChange={this.handleOnlyShowPrjWithGoalsChange}
                handleTrackingPeriodTypeChange={this.handleTrackingPeriodTypeChange}
                handleClosingOptionsMissingAlert={async () => {
                    await this.updateState({ optionsMissing: false });
                }}
                handleTrackingPeriodStartCustomValueChange={this.handleTrackingPeriodStartCustomValueChange}
                handleTrackingPeriodEndCustomValueChange={this.handleTrackingPeriodEndCustomValueChange}
            />
        );
    }
}

export default PopupPageContainer;
