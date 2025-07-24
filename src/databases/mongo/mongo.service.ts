import mongoose from "mongoose";
import { config, DotenvParseOutput } from "dotenv";
import { MongoOptions } from "./mongo.interface";

export class MongoService implements MongoOptions {
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

    public async handle(): Promise<void> {
        const url = this.config.MONGO_URL;

        if (!url) {
            throw new Error("The MONGO_URL variables are not set");
        }

        await mongoose.connect(url, {
            dbName: "water-tg-bot-mongo"
        });

        console.log("Mongo has been connected");
    }

    public async disconnect(): Promise<void> {
        await mongoose.disconnect();
        console.log("Mongo has been disconnected");
    }

    public createSchema<T extends object>(name: string, definition: mongoose.SchemaDefinition<T>): mongoose.Model<T> {
        const schema: mongoose.Schema<T> = new mongoose.Schema<T>(definition);
        return mongoose.model<T>(name, schema);
    }
}