import dotenv from "dotenv";
import { ConfigModel } from "./config.model";
dotenv.config({ quiet: true });

export class ConfigService implements ConfigModel {
    private config: string;

    constructor() {
        const token: string | undefined = process.env.TOKEN;

        if (!token) {
            throw new Error("TOKEN not found");
        }

        this.config = token;
    }

    getToken(): string {
        return this.config;
    }
}