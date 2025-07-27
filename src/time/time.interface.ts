import { DateTime } from "luxon";

export interface TimeOptions {
    getCurrentTime(timezone: string): string;
    getToday(timezone: string): DateTime;
    getDiff(objectWake: DateTime, objectSleep: DateTime): number;
}