import { config, DotenvParseOutput } from "dotenv";
import { ConfigModel } from "./config.model";

export class ConfigService implements ConfigModel {
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
    }

    public get(key: string): string {
        const result = this.config[key];

        if (!result) {
            throw new Error(`Invalid type for key: ${key}`);
        }

        return result;
    }
}