import * as React from 'react';
import {
    addProjects,
    getProjectNames,
    getProjectStatuses,
    loadCustomizations,
    ProjectSingleFieldStatuses,
    ProjectStatuses,
    storeCustomizations,
    updateProjectGoals,
    updateProjectRecordedTimes,
} from '../storage';
import { Order, TableSortRowKey } from '../types';
import { retrieveProjects, retrieveRecordedTimes } from '../togglTrackApi';
import { RefObject } from 'react';
import PopupPage from './PopupPage';

interface State {
    projects: ProjectStatuses;
    onlyShowPrjWithGoals: boolean;
    msgVisible: boolean;
    order: Order;
    orderBy: TableSortRowKey;
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
            void storeCustomizations(newPartialState);

            return newPartialState;
        });
    };

    private handleUpdateRecordedTimes = async () => {
        try {
            const [recordedTimes, storedNames] = await Promise.all([retrieveRecordedTimes(), getProjectNames()]);
            const projectRecordedTimes: ProjectSingleFieldStatuses = {};
            for (const [projectName, hours] of Object.entries(recordedTimes)) {
                if (!storedNames.includes(projectName)) {
                    return Promise.reject(`Found nonexistent project: ${projectName}. Please update projects first.`);
                }
                projectRecordedTimes[projectName] = hours;
            }
            await updateProjectRecordedTimes(projectRecordedTimes);
            await this.updateProjectStatusesView();
            this.showSuccessMessage();
        } catch (e) {
            alert(e);
        }
    };

    private handleSaveGoals = async () => {
        try {
            const storedNames = await getProjectNames();
            const projectGoals: ProjectSingleFieldStatuses = {};
            storedNames.forEach((projectName) => {
                const stateGoalValue = this.state.projects[projectName].goal;
                const goalFloat = parseFloat(stateGoalValue);
                projectGoals[projectName] = isNaN(goalFloat) || goalFloat <= 0.0 ? '' : stateGoalValue;
            });
            await updateProjectGoals(projectGoals);
            await this.updateProjectStatusesView();
            this.showSuccessMessage();
        } catch (e) {
            alert(e);
        }
    };

    private handleUpdateProjects = async () => {
        try {
            const [currNames, storedNames] = await Promise.all([retrieveProjects(), getProjectNames()]);

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
            await addProjects(newNames, removeUnused, unusedNames);
            await this.updateProjectStatusesView();
            this.showSuccessMessage();
        } catch (e) {
            alert(e);
        }
    };

    private static handleOpenInNewTab = () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    };

    private handleOnlyShowPrjWithGoalsChange = async (onlyShowPrjWithGoalsCheckbox: RefObject<HTMLInputElement>) => {
        const currValue = onlyShowPrjWithGoalsCheckbox.current.checked;
        this.setState({ onlyShowPrjWithGoals: currValue });

        // persist to Chrome storage
        await storeCustomizations({ onlyShowPrjWithGoals: currValue });
    };

    private handleGoalInputChange = (event: React.ChangeEvent<HTMLInputElement>, namePrefix: string) => {
        if (event.target.name.startsWith(namePrefix)) {
            const projectName = event.target.name.substring(namePrefix.length);
            const projects = { ...this.state.projects };
            projects[projectName].goal = event.target.value;
            this.setState({ projects: projects });
        }
    };

    private updateProjectStatusesView = async () => {
        const projects = await getProjectStatuses();
        this.setState({ projects: projects });
    };

    private showSuccessMessage = () => {
        this.setState({ msgVisible: true }, () => {
            setTimeout(() => {
                this.setState({ msgVisible: false });
            }, 750);
        });
    };

    async componentDidMount(): Promise<void> {
        const customizations = await loadCustomizations();
        this.setState({
            onlyShowPrjWithGoals: customizations.onlyShowPrjWithGoals,
            order: customizations.order,
            orderBy: customizations.orderBy,
        });
        await this.updateProjectStatusesView();
    }

    render(): JSX.Element {
        return (
            <PopupPage
                projects={this.state.projects}
                onlyShowPrjWithGoals={this.state.onlyShowPrjWithGoals}
                msgVisible={this.state.msgVisible}
                order={this.state.order}
                orderBy={this.state.orderBy}
                handleUpdateRecordedTimes={this.handleUpdateRecordedTimes}
                handleGoalInputChange={this.handleGoalInputChange}
                handleSaveGoals={this.handleSaveGoals}
                handleUpdateProjects={this.handleUpdateProjects}
                handleOpenInNewTab={PopupPageContainer.handleOpenInNewTab}
                handleRequestSort={this.handleRequestSort}
                handleOnlyShowPrjWithGoalsChange={this.handleOnlyShowPrjWithGoalsChange}
            />
        );
    }
}

export default PopupPageContainer;
