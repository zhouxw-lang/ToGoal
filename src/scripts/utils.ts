import * as dayjs from 'dayjs';
import { Dayjs } from 'dayjs';

export function getWeeklySinceUntilDates(firstDayOfWeek: string): [Date, Date] {
    const now = new Date();
    const lessDays = (now.getDay() - parseInt(firstDayOfWeek) + 7) % 7;
    const sinceDate = new Date(new Date(now).setDate(now.getDate() - lessDays));
    sinceDate.setHours(0, 0, 0, 0);
    const untilDate = new Date(new Date(sinceDate).setDate(sinceDate.getDate() + 6));
    untilDate.setHours(23, 59, 59, 999);
    return [sinceDate, untilDate];
}

export function getMonthlySinceUntilDates(): [Date, Date] {
    const sinceDate = dayjs().startOf('month').toDate();
    const untilDate = dayjs().endOf('month').toDate();
    return [sinceDate, untilDate];
}

export function getTodayBeginning(): Date {
    return dayjs().startOf('day').toDate();
}

export function getTodayEnd(): Date {
    return dayjs().endOf('day').toDate();
}

export function formatDayjs(dt: Dayjs): string {
    return dt.format('YYYY-MM-DD');
}

export function formatDate(date: Date): string {
    return formatDayjs(dayjs(date));
}
