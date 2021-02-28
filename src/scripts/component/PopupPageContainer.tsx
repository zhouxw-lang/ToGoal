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
import { getWeeklySinceUntilDates } from '../utils';
import { FIRST_DAY_OF_WEEK_KEY, loadOptions } from '../storage';

interface State extends Customizations {
    projects: ProjectStatuses;
    msgVisible: boolean;
    trackingPeriodStart: Date;
    trackingPeriodEnd: Date;
}

class PopupPageContainer extends React.Component<Readonly<Record<string, never>>, State> {
    constructor(props: Readonly<Record<string, never>>) {
        super(props);

        this.state = {
            projects: {},
            onlyShowPrjWithGoals: false,
            msgVisible: false,
            order: 'asc',
            orderBy: 'project',
            trackingPeriodType: 'weekly',
            trackingPeriodStart: new Date(),
            trackingPeriodEnd: new Date(),
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

    private handleUpdateRecordedTimes = async (silent = false) => {
        try {
            const [recordedTimes, storedNames] = await Promise.all([
                retrieveRecordedTimes(
                    this.state.trackingPeriodStart.toISOString().slice(0, 10),
                    this.state.trackingPeriodEnd.toISOString().slice(0, 10)
                ),
                Storage.getProjectNames(),
            ]);
            const projectRecordedTimes: ProjectSingleFieldStatuses = {};
            for (const [projectName, hours] of Object.entries(recordedTimes)) {
                if (!storedNames.includes(projectName)) {
                    return Promise.reject(`Found nonexistent project: ${projectName}. Please update projects first.`);
                }
                projectRecordedTimes[projectName] = hours;
            }
            await Storage.updateProjectRecordedTimes(projectRecordedTimes);
            await this.updateProjectStatusesView();
            if (!silent) {
                this.showSuccessMessage();
            }
        } catch (e) {
            if (!silent) {
                alert(e);
            }
        }
    };

    private handleSaveGoals = async () => {
        try {
            const storedNames = await Storage.getProjectNames();
            const projectGoals: ProjectSingleFieldStatuses = {};
            storedNames.forEach((projectName) => {
                const stateGoalValue = this.state.projects[projectName].goal;
                const goalFloat = parseFloat(stateGoalValue);
                projectGoals[projectName] = isNaN(goalFloat) || goalFloat <= 0.0 ? '' : stateGoalValue;
            });
            await Storage.updateProjectGoals(projectGoals);
            await this.updateProjectStatusesView();
            this.showSuccessMessage();
        } catch (e) {
            alert(e);
        }
    };

    private handleUpdateProjects = async () => {
        try {
            const [currNames, storedNames] = await Promise.all([retrieveProjects(), Storage.getProjectNames()]);

            const newNames = currNames.filter((name) => !storedNames.includes(name));

            let removeUnused = false;
            const unusedNames = storedNames.filter((name) => !currNames.includes(name));
            if (unusedNames.length !== 0) {
                const msg =
                    'The following projects are unused, do you want to remove them?\n\n' + unusedNames.join('\n');
                if (confirm(msg)) {
                    removeUnused = true;
                }
            }
            await Storage.addProjects(newNames, removeUnused, unusedNames);
            await this.updateProjectStatusesView();
            this.showSuccessMessage();
        } catch (e) {
            alert(e);
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
            const projects = { ...this.state.projects };
            projects[projectName].goal = event.target.value;
            this.setState({ projects: projects });
        }
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
            const options = await loadOptions();
            if (!options.hasOwnProperty(FIRST_DAY_OF_WEEK_KEY)) {
                throw new Error('API Token or workspace ID is empty. Please set them in options.');
            }

            [trackingPeriodStart, trackingPeriodEnd] = getWeeklySinceUntilDates(options[FIRST_DAY_OF_WEEK_KEY]);
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

    private showSuccessMessage = () => {
        this.setState({ msgVisible: true }, () => {
            setTimeout(() => {
                this.setState({ msgVisible: false });
            }, 750);
        });
    };

    async componentDidMount(): Promise<void> {
        await this.setStateCustomizations();
        await this.setStateTrackingPeriodDates();

        await this.updateProjectStatusesView();
        await this.handleUpdateRecordedTimes(true);
    }

    private setStateCustomizations = async (): Promise<void> => {
        const customizations = await Storage.loadCustomizations();
        return new Promise((resolve) => {
            this.setState(customizations, () => resolve());
        });
    };

    render(): JSX.Element {
        return (
            <PopupPage
                projects={this.state.projects}
                onlyShowPrjWithGoals={this.state.onlyShowPrjWithGoals}
                msgVisible={this.state.msgVisible}
                order={this.state.order}
                orderBy={this.state.orderBy}
                trackingPeriodType={this.state.trackingPeriodType}
                trackingPeriodStart={this.state.trackingPeriodStart}
                trackingPeriodEnd={this.state.trackingPeriodEnd}
                handleUpdateRecordedTimes={this.handleUpdateRecordedTimes}
                handleGoalInputChange={this.handleGoalInputChange}
                handleSaveGoals={this.handleSaveGoals}
                handleUpdateProjects={this.handleUpdateProjects}
                handleOpenInNewTab={PopupPageContainer.handleOpenInNewTab}
                handleRequestSort={this.handleRequestSort}
                handleOnlyShowPrjWithGoalsChange={this.handleOnlyShowPrjWithGoalsChange}
                handleTrackingPeriodTypeChange={this.handleTrackingPeriodTypeChange}
            />
        );
    }
}

export default PopupPageContainer;
