import * as dayjs from 'dayjs';

export function getWeeklySinceUntilDates(firstDayOfWeek: string): [Date, Date] {
    const now = new Date();
    const lessDays = (now.getDay() - parseInt(firstDayOfWeek) + 7) % 7;
    const sinceDate = new Date(new Date(now).setDate(now.getDate() - lessDays));
    const untilDate = new Date(new Date(sinceDate).setDate(sinceDate.getDate() + 6));
    return [sinceDate, untilDate];
}

export function getMonthlySinceUntilDates(): [Date, Date] {
    const sinceDate = dayjs().startOf('month').toDate();
    const untilDate = dayjs().endOf('month').toDate();
    return [sinceDate, untilDate];
}
