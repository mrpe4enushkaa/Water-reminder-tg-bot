import { DateTime } from "luxon";
import { TimeOptions } from "./time.interface";

export class TimeService implements TimeOptions {
    public getCurrentTime(timezone: string): string {
        return DateTime.now().setZone(timezone).toFormat("HH:mm");
    }

    public getToday(timezone: string): DateTime {
        return DateTime.now().setZone(timezone).startOf("day");
    }

    public getDiff(objectWake: DateTime, objectSleep: DateTime): number {
        if (objectSleep <= objectWake) {
            objectSleep = objectSleep.plus({ days: 1 });
        }
        return objectSleep.diff(objectWake, "minutes").minutes;
    }
}