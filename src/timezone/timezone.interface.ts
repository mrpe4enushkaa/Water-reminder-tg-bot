export interface TimezoneOptions {
    getTimezone(city: string): Promise<string | undefined>;
}