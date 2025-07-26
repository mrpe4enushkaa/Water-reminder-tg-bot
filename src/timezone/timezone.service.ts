import { config, DotenvParseOutput } from "dotenv";
import { TimezoneOptions } from "./timezone.interface";

export class TimezoneService implements TimezoneOptions {
    private config: DotenvParseOutput;

    constructor() {
        const { error, parsed } = config();

        if (error) {
            throw new Error(`File ".env" not found`);
        }
        if (!parsed) {
            throw new Error(`File ".env" is empty`);
        }

        this.config = parsed;

        if (!this.config.OPENCAGE_API_KEY || !this.config.TIMEZONEDB_API_KEY) {
            throw new Error(`The OPENCAGE_API_KEY or TIMEZONEDB_API_KEY variables are not set`);
        }
    }

    public async getTimezone(city: string): Promise<string | undefined> {
        const urlOpenCage = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${this.config.OPENCAGE_API_KEY}`;
        const responseOpenCage = await fetch(urlOpenCage);
        const dataOpenCage = await responseOpenCage.json();

        if (!dataOpenCage || !dataOpenCage.results || dataOpenCage.results.length === 0) {
            return undefined;
        }

        const preferredResult = dataOpenCage.results.find((result: any) =>
            result.components?.country_code?.toLowerCase() === "ru"
        ) || dataOpenCage.results[0];

        if (!preferredResult || !preferredResult.geometry) {
            return undefined;
        }

        const { lat, lng } = preferredResult.geometry;

        if (!lat || !lng) return undefined;

        const urlTimezonedb = `https://api.timezonedb.com/v2.1/get-time-zone?key=${this.config.TIMEZONEDB_API_KEY}&format=json&by=position&lat=${lat}&lng=${lng}`;
        const responseTimezonedb = await fetch(urlTimezonedb);
        const dataTimezonedb = await responseTimezonedb.json();

        if (!dataTimezonedb || !dataTimezonedb.zoneName) return undefined;

        return dataTimezonedb.zoneName;
    }
}