import * as React from 'react';

import { GOAL_KEY, RECORDED_TIME_KEY } from '../storage';
import {
    Button,
    Checkbox,
    Container,
    FormControl,
    FormControlLabel,
    FormLabel,
    Paper,
    Radio,
    RadioGroup,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@material-ui/core';
import TimelapseIcon from '@material-ui/icons/Timelapse';
import SaveIcon from '@material-ui/icons/Save';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { Alert } from '@material-ui/lab';
import TableSortLabel from '@material-ui/core/TableSortLabel';
import { Order, ProjectStatuses, TableSortRow, TableSortRowKey, TrackingPeriodType } from '../types';
import { withStyles, Theme, createStyles } from '@material-ui/core/styles';

import '../../styles/PopupPage.scss';

interface TableDisplayRow {
    displayGoal: JSX.Element;
    displayRecordedTime: string;
    displayProgress: string;
    displayRemainingTime: string;
}

type TableDataRow = TableSortRow & TableDisplayRow;

function descendingComparator(a: TableSortRow, b: TableSortRow, orderBy: TableSortRowKey) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function getComparator(order: Order, orderBy: TableSortRowKey): (a: TableSortRow, b: TableSortRow) => number {
    return order === 'desc'
        ? (a, b) => descendingComparator(a, b, orderBy)
        : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array: TableDataRow[], comparator: (a: TableSortRow, b: TableSortRow) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [TableDataRow, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) return order;
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

interface TableColumn {
    id: TableSortRowKey;
    label: string;
    numeric: boolean;
}

const headCells: TableColumn[] = [
    { id: 'project', label: 'Project', numeric: false },
    { id: 'goal', label: 'Goal (hours)', numeric: true },
    { id: 'recordedTime', label: 'Recorded time', numeric: true },
    { id: 'progress', label: 'Progress (%)', numeric: true },
    { id: 'remainingTime', label: 'Remaining time', numeric: true },
];

const displayRowKeys = {
    project: 'project',
    goal: 'displayGoal',
    recordedTime: 'displayRecordedTime',
    progress: 'displayProgress',
    remainingTime: 'displayRemainingTime',
};

interface PopupPageProps {
    projects: ProjectStatuses;
    onlyShowPrjWithGoals: boolean;
    msgVisible: boolean;
    order: Order;
    orderBy: TableSortRowKey;
    trackingPeriodType: TrackingPeriodType;
    trackingPeriodStart: Date;
    trackingPeriodEnd: Date;
    handleUpdateRecordedTimes: () => Promise<void>;
    handleGoalInputChange: (event: React.ChangeEvent<HTMLInputElement>, namePrefix: string) => void;
    handleSaveGoals: () => Promise<void>;
    handleUpdateProjects: () => Promise<void>;
    handleOpenInNewTab: () => void;
    handleRequestSort: (event: React.MouseEvent<unknown>, property: TableSortRowKey) => void;
    handleOnlyShowPrjWithGoalsChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    handleTrackingPeriodTypeChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

const GOAL_INPUT_PREFIX = 'goalinput-';

const StyledTableRow = withStyles((theme: Theme) =>
    createStyles({
        root: {
            '&:nth-of-type(odd)': {
                backgroundColor: theme.palette.action.hover,
            },
        },
    })
)(TableRow);

const PopupPage = ({
    projects,
    onlyShowPrjWithGoals,
    msgVisible,
    order,
    orderBy,
    trackingPeriodType,
    trackingPeriodStart,
    trackingPeriodEnd,
    handleUpdateRecordedTimes,
    handleGoalInputChange,
    handleSaveGoals,
    handleUpdateProjects,
    handleOpenInNewTab,
    handleRequestSort,
    handleOnlyShowPrjWithGoalsChange,
    handleTrackingPeriodTypeChange,
}: PopupPageProps): JSX.Element => {
    const tableData: TableDataRow[] = Object.keys(projects)
        .map((projectName) => {
            const projectObj = projects[projectName];

            const isNoGoal = isNaN(parseFloat(projectObj[GOAL_KEY]));
            if (onlyShowPrjWithGoals && isNoGoal) {
                return null;
            }
            const goal = isNoGoal ? 0.0 : parseFloat(projectObj[GOAL_KEY]);

            const isNoRecordedTime = isNaN(parseFloat(projectObj[RECORDED_TIME_KEY]));
            const recordedTime = isNoRecordedTime ? 0.0 : parseFloat(projectObj[RECORDED_TIME_KEY]);

            const isNoGoalNorRecordedTime = isNoGoal && isNoRecordedTime;

            let remainingTime;
            let progress;
            if (isNoGoalNorRecordedTime) {
                // Make them minus for sorting
                progress = -1;
                remainingTime = -1;
            } else if (recordedTime >= goal) {
                progress = 100;
                remainingTime = 0.0;
            } else {
                progress = goal === 0.0 ? 100 : Math.floor((recordedTime * 100.0) / goal);
                remainingTime = goal - recordedTime;
            }

            return {
                project: projectName,
                goal,
                displayGoal: (
                    <input
                        type="text"
                        className="togoal-GoalInput"
                        id={`${GOAL_INPUT_PREFIX}${projectName}`}
                        name={`${GOAL_INPUT_PREFIX}${projectName}`}
                        value={projectObj[GOAL_KEY] ? projectObj[GOAL_KEY] : ''}
                        onChange={(event) => handleGoalInputChange(event, GOAL_INPUT_PREFIX)}
                    />
                ),
                recordedTime,
                displayRecordedTime: isNoRecordedTime ? '' : recordedTime.toFixed(2),
                progress,
                displayProgress: isNoGoalNorRecordedTime ? '' : progress.toFixed(0),
                remainingTime,
                displayRemainingTime: isNoGoalNorRecordedTime ? '' : remainingTime.toFixed(2),
            };
        })
        .filter((x) => x != null);

    const sortingComparator = getComparator(order, orderBy);

    return (
        <Container className="togoal-Container">
            <div className="togoal-MenuButtonContainer">
                <Button
                    variant="contained"
                    color="primary"
                    disableElevation
                    size="small"
                    onClick={handleUpdateRecordedTimes}
                    startIcon={<TimelapseIcon />}
                    className="togoal-MenuButton"
                >
                    Update recorded times
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    disableElevation
                    size="small"
                    onClick={handleSaveGoals}
                    startIcon={<SaveIcon />}
                    className="togoal-MenuButton"
                >
                    Save goals
                </Button>
                <Button
                    variant="outlined"
                    disableElevation
                    size="small"
                    onClick={handleUpdateProjects}
                    className="togoal-MenuButton"
                >
                    Update projects
                </Button>
                <Button
                    color="primary"
                    size="small"
                    onClick={handleOpenInNewTab}
                    startIcon={<OpenInNewIcon />}
                    className="togoal-MenuButton"
                >
                    Open in new tab
                </Button>
            </div>
            {msgVisible && (
                <Alert severity="success" className="togoal-AlertBar">
                    Done.
                </Alert>
            )}

            <div className="togoal-TrackingPeriod">
                Trcking period: {trackingPeriodStart.toLocaleDateString()} ~ {trackingPeriodEnd.toLocaleDateString()}
            </div>

            <div className="togoal-ProjectStatusesView">
                <Paper>
                    <TableContainer>
                        <Table stickyHeader>
                            <TableHead>
                                <TableRow>
                                    {headCells.map((headCell) => (
                                        <TableCell
                                            key={headCell.id}
                                            align={headCell.numeric ? 'right' : 'left'}
                                            sortDirection={orderBy === headCell.id ? order : false}
                                            className="togoal-ProjectStatusesView-cell"
                                        >
                                            <TableSortLabel
                                                active={orderBy === headCell.id}
                                                direction={orderBy === headCell.id ? order : 'asc'}
                                                onClick={(event) => handleRequestSort(event, headCell.id)}
                                            >
                                                {headCell.label}
                                            </TableSortLabel>
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>

                            <TableBody>
                                {stableSort(tableData, sortingComparator).map((row, rowIndex) => (
                                    <StyledTableRow hover role="checkbox" tabIndex={-1} key={rowIndex}>
                                        {headCells.map((headCell, cellIndex) => (
                                            <TableCell
                                                key={`${rowIndex}-${cellIndex}`}
                                                align={headCell.numeric ? 'right' : 'left'}
                                                className="togoal-ProjectStatusesView-cell"
                                            >
                                                {row[displayRowKeys[headCell.id] as keyof TableDisplayRow]}
                                            </TableCell>
                                        ))}
                                    </StyledTableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </div>

            <FormControl component="fieldset">
                <FormLabel component="legend">Tracking period type: </FormLabel>
                <RadioGroup
                    row
                    name="trackingPeriodType"
                    value={trackingPeriodType}
                    onChange={handleTrackingPeriodTypeChange}
                >
                    <FormControlLabel value="daily" control={<Radio color="primary" />} label="Daily" />
                    <FormControlLabel value="weekly" control={<Radio color="primary" />} label="Weekly" />
                    <FormControlLabel value="monthly" control={<Radio color="primary" />} label="Monthly" />
                    <FormControlLabel value="custom" control={<Radio color="primary" />} label="Custom" />
                </RadioGroup>
            </FormControl>

            <FormControlLabel
                control={
                    <Checkbox
                        checked={onlyShowPrjWithGoals}
                        onChange={handleOnlyShowPrjWithGoalsChange}
                        color="primary"
                    />
                }
                label="Only show projects with goals"
            />
        </Container>
    );
};

export default PopupPage;
