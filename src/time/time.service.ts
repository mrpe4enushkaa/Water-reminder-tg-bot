import luxon from "luxon";
import { TimeOptions } from "./time.interface";

export class TimeService implements TimeOptions {
    public getCurrentTime(timezone: string): string {
        return luxon.DateTime.now().setZone(timezone).toFormat("HH:mm");
    }
}