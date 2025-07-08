import dotenv from "dotenv";
import { IConfig } from "./config.interface";
dotenv.config({ quiet: true });

// export const config: IConfig = {
//     token: process.env.TOKEN || (() => { throw new Error("TOKEN not found") })()
// };

export class Config implements IConfig {
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