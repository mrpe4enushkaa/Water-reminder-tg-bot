import mongoose from "mongoose";

export interface MongoOptions {
    handle(): Promise<void>;
    disconnect(): Promise<void>;
    createSchema<T extends object>(name: string, definition: mongoose.SchemaDefinition<T>): mongoose.Model<T>;
}