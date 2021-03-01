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
import { getMonthlySinceUntilDates, getWeeklySinceUntilDates } from '../utils';
import { FIRST_DAY_OF_WEEK_KEY, loadOptions } from '../storage';

interface State extends Customizations {
    projects: ProjectStatuses;
    projectInputtedGoals: Record<string, string>;
    msgVisible: boolean;
    msgContent: string;
    trackingPeriodStart: Date;
    trackingPeriodEnd: Date;
    optionsMissing: boolean;
}

class PopupPageContainer extends React.Component<Readonly<Record<string, never>>, State> {
    constructor(props: Readonly<Record<string, never>>) {
        super(props);

        this.state = {
            projects: {},
            projectInputtedGoals: {},
            onlyShowPrjWithGoals: false,
            msgVisible: false,
            msgContent: '',
            order: 'asc',
            orderBy: 'project',
            trackingPeriodType: 'weekly',
            trackingPeriodStart: new Date(),
            trackingPeriodEnd: new Date(),
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
                this.showSuccessMessage('Updates pulled from Toggl Track!');
            }
        } catch (e) {
            if (!silent) {
                alert(e);
            }
        }
    };

    private innerUpdateRecordedTimes = async () => {
        const [recordedTimes, storedNames] = await Promise.all([
            retrieveRecordedTimes(
                this.state.trackingPeriodStart.toISOString().slice(0, 10),
                this.state.trackingPeriodEnd.toISOString().slice(0, 10)
            ),
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
                this.showSuccessMessage('Goals saved!');
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
        this.setState({ onlyShowPrjWithGoals: newValue });

        // persist to Chrome storage
        await Storage.storeCustomizations({ onlyShowPrjWithGoals: newValue });
    };

    private handleTrackingPeriodTypeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = event.target.value as TrackingPeriodType;
        await this.setStateTrackingPeriodType(newValue);

        // persist to Chrome storage
        await Storage.storeCustomizations({ trackingPeriodType: newValue });

        await this.setStateTrackingPeriodDates();
        await this.handleUpdateRecordedTimes(true);
    };

    private handleGoalInputChange = (event: React.ChangeEvent<HTMLInputElement>, namePrefix: string) => {
        if (event.target.name.startsWith(namePrefix)) {
            const projectName = event.target.name.substring(namePrefix.length);
            const projectInputtedGoals = { ...this.state.projectInputtedGoals };
            projectInputtedGoals[projectName] = event.target.value;
            this.setState({ projectInputtedGoals });
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
        this.setState({ projectInputtedGoals: {} });
    };

    private setStateTrackingPeriodType = async (trackingPeriodType: TrackingPeriodType): Promise<void> => {
        return new Promise((resolve) => {
            this.setState({ trackingPeriodType }, () => resolve());
        });
    };

    private setStateTrackingPeriodDates = async (): Promise<void> => {
        let trackingPeriodStart: Date;
        let trackingPeriodEnd: Date;
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
            const today = new Date();
            trackingPeriodStart = today;
            trackingPeriodEnd = today;
        } else {
            // TODO
            trackingPeriodStart = new Date();
            trackingPeriodEnd = new Date();
        }

        return new Promise((resolve) => {
            this.setState({ trackingPeriodStart, trackingPeriodEnd }, () => resolve());
        });
    };

    private updateProjectStatusesView = async (): Promise<void> => {
        const projects = await Storage.getProjectStatuses();
        return new Promise((resolve) => {
            this.setState({ projects: projects }, () => resolve());
        });
    };

    private showSuccessMessage = (msgContent: string) => {
        this.setState({ msgVisible: true, msgContent }, () => {
            setTimeout(() => {
                this.setState({ msgVisible: false });
            }, 1500);
        });
    };

    async componentDidMount(): Promise<void> {
        await this.checkOptionsMissing();
        await this.setStateTrackingPeriodDates();
        await this.setStateCustomizations();

        await this.updateProjectStatusesView();
        await this.handleUpdateRecordedTimes(true);
    }

    private setStateCustomizations = async (): Promise<void> => {
        const customizations = await Storage.loadCustomizations();
        return new Promise((resolve) => {
            this.setState(customizations, () => resolve());
        });
    };

    private checkOptionsMissing = async (): Promise<void> => {
        try {
            await loadOptions();
        } catch (e) {
            return new Promise((resolve) => {
                this.setState({ optionsMissing: true }, () => resolve());
            });
        }
    };

    render(): JSX.Element {
        return (
            <PopupPage
                projects={this.state.projects}
                projectInputtedGoals={this.state.projectInputtedGoals}
                onlyShowPrjWithGoals={this.state.onlyShowPrjWithGoals}
                msgVisible={this.state.msgVisible}
                msgContent={this.state.msgContent}
                order={this.state.order}
                orderBy={this.state.orderBy}
                trackingPeriodType={this.state.trackingPeriodType}
                trackingPeriodStart={this.state.trackingPeriodStart}
                trackingPeriodEnd={this.state.trackingPeriodEnd}
                optionsMissing={this.state.optionsMissing}
                handleUpdateRecordedTimes={() => this.handleUpdateRecordedTimes(false)}
                handleGoalInputChange={this.handleGoalInputChange}
                handleGoalInputBlur={this.handleGoalInputBlur}
                handleSaveGoals={() => this.handleSaveGoals(false)}
                handleOpenInNewTab={PopupPageContainer.handleOpenInNewTab}
                handleRequestSort={this.handleRequestSort}
                handleOnlyShowPrjWithGoalsChange={this.handleOnlyShowPrjWithGoalsChange}
                handleTrackingPeriodTypeChange={this.handleTrackingPeriodTypeChange}
                handleClosingOptionsMissingAlert={() => {
                    this.setState({ optionsMissing: false });
                }}
            />
        );
    }
}

export default PopupPageContainer;
