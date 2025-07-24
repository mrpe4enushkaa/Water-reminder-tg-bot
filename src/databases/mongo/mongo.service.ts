import mongoose from "mongoose";
import { config, DotenvParseOutput } from "dotenv";
import { MongoOptions } from "./mongo.interface";
import { UserModel } from "../../models/user-model.type";
import { isValidUser } from "../../utils/validators";

export class MongoService implements MongoOptions {
    private config: DotenvParseOutput;
    private userModel: mongoose.Model<UserModel> | undefined = undefined;

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

    public createUsersSchema(): void {
        if (this.userModel) return;

        const userSchema: mongoose.Schema<UserModel> = new mongoose.Schema({
            telegramId: { type: Number, required: true },
            weight: { type: Number, required: true },
            city: { type: String, required: true },
            time: {
                type: [String],
                required: true,
                validate: {
                    validator: (value: string[]) => value.length === 2,
                    message: "The 'time' field must contain exactly two values (for example, ['08:00', '20:00'])"
                }
            },
            goal: { type: Number, required: true },
            mute: { type: Boolean, required: true }
        });

        this.userModel = mongoose.model<UserModel>("Users", userSchema);
        return;
    }

    public async addUser(data: UserModel): Promise<void> {
        if (!this.userModel) throw new Error("The 'UserScheme' schema is not initialized");
        if (!isValidUser(data)) throw new Error("Invalid user data. All fields are required");
        await this.userModel.create(data);
    }

    public async editUser(data: UserModel): Promise<void> {
        if (!this.userModel) throw new Error("The 'UserScheme' schema is not initialized");

        const updateData: Partial<UserModel> = {};

        if (data.weight !== undefined) updateData.weight = data.weight;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.time !== undefined) updateData.time = data.time;
        if (data.goal !== undefined) updateData.goal = data.goal;
        if (data.mute !== undefined) updateData.mute = data.mute;

        if (Object.keys(updateData).length === 0) return;

        await this.userModel.updateOne(
            { telegramId: data.telegramId },
            { $set: updateData }
        );
    }

    public async deleteUser(telegramId: number): Promise<void> {
        if (!this.userModel) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userModel.deleteOne({ telegramId });
    }

    public async continueSendPushNotifications(telegramId: number): Promise<void> {
        if (!this.userModel) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userModel.updateOne(
            { telegramId },
            { $set: { mute: false } }
        );
    }

    public async stopSendPushNotifications(telegramId: number): Promise<void> {
        if (!this.userModel) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userModel.updateOne(
            { telegramId },
            { $set: { mute: true } }
        );
    }
}