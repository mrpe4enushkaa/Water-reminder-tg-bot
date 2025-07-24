import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { RedisService } from "../databases/redis/redis.service";
import { UserData } from "../models/user-data.type";
import mongoose from "mongoose";
import { isValidUser } from "../utils/validators";

export abstract class Command {
    constructor(
        protected bot: TelegramBot,
        private userSchema: mongoose.Model<UserData>,
        private redis: RedisService
    ) { }

    abstract handle(): void;

    protected async setWaitingState(telegramChatId: number, state: WaitingStates): Promise<void> {
        await this.redis.set(`waiting-state:${telegramChatId}`, state);
    }

    protected async getWaitingState(telegramChatId: number): Promise<WaitingStates | undefined> {
        const data = await this.redis.get<string>(`waiting-state:${telegramChatId}`);
        if (!data) return undefined;
        const state = parseInt(data);
        return isNaN(state) ? undefined : state;
    }

    protected async deleteWaitingState(telegramChatId: number): Promise<void> {
        await this.redis.delete(`waiting-state:${telegramChatId}`);
    }

    protected async setTrackedMessages(telegramChatId: number, ids: MessagesIdsTuple): Promise<void> {
        const data: Record<string, string> = {
            firstMessageId: String(ids[0]),
            secondMessageId: String(ids[1])
        }
        await this.redis.hset(`tracked-messages:${telegramChatId}`, data);
    }

    protected async getTrackedMessages(telegramChatId: number): Promise<MessagesIdsTuple> {
        const data = await this.redis.hget(`tracked-messages:${telegramChatId}`);
        let firstMessageId: number | undefined = parseInt(data.firstMessageId);
        let secondMessageId: number | undefined = parseInt(data.secondMessageId);
        if (isNaN(firstMessageId)) firstMessageId = undefined;
        if (isNaN(secondMessageId)) secondMessageId = undefined;
        return [firstMessageId, secondMessageId];
    }

    protected async deleteTrackedMessages(telegramChatId: number): Promise<void> {
        await this.redis.delete(`tracked-messages:${telegramChatId}`);
    }

    protected async setEditParametersFlag(telegramChatId: number): Promise<void> {
        await this.redis.sadd(`edit-parameters`, telegramChatId);
    }

    protected async hasEditParametersFlag(telegramChatId: number): Promise<boolean> {
        const data = await this.redis.sismember(`edit-parameters`, telegramChatId);
        return data === 1;
    }

    protected async clearEditParametersFlag(telegramChatId: number): Promise<void> {
        await this.redis.sremove(`edit-parameters`, telegramChatId);
    }

    protected async setIntermediateUserData(enteredData: UserData): Promise<void> {
        const currentData = await this.getIntermediateUserData(enteredData.telegramChatId);

        const mergedData: UserData = {
            telegramChatId: enteredData.telegramChatId ?? currentData?.telegramChatId,
            weight: enteredData.weight ?? currentData?.weight ?? undefined,
            city: enteredData.city ?? currentData?.city ?? undefined,
            time: enteredData.time ?? currentData?.time ?? undefined,
            goal: enteredData.goal ?? currentData?.goal ?? undefined,
            mute: enteredData.mute ?? currentData?.mute ?? false
        }

        await this.redis.set(`intermediate-user-data:${enteredData.telegramChatId}`, mergedData);
    }

    protected async getIntermediateUserData(telegramChatId: number): Promise<UserData> {
        const emptyData: UserData = {
            telegramChatId,
            weight: undefined,
            city: undefined,
            time: undefined,
            goal: undefined,
            mute: false
        }
        const data = await this.redis.get<UserData>(`intermediate-user-data:${telegramChatId}`);
        return !data ? emptyData : data;
    }

    protected async deleteIntermediateUserData(telegramChatId: number): Promise<void> {
        await this.redis.delete(`intermediate-user-data:${telegramChatId}`);
    }

    protected async addUserData(data: UserData): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        if (!isValidUser(data)) throw new Error("Invalid user data. All fields are required");
        await this.userSchema.create(data);
    }

    protected async getUserData(telegramChatId: number): Promise<UserData | undefined> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        const data = await this.userSchema.findOne({ telegramChatId });
        return !data ? undefined : data;
    }

    protected async updateUserData(data: UserData): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        const currentData = await this.getIntermediateUserData(data.telegramChatId);

        const mergedData: UserData = {
            telegramChatId: data.telegramChatId ?? currentData?.telegramChatId,
            weight: data.weight ?? currentData?.weight ?? undefined,
            city: data.city ?? currentData?.city ?? undefined,
            time: data.time ?? currentData?.time ?? undefined,
            goal: data.goal ?? currentData?.goal ?? undefined,
            mute: data.mute ?? currentData?.mute ?? false
        }

        await this.userSchema.updateOne(
            { telegramChatId: data.telegramChatId },
            { $set: mergedData }
        );
    }

    protected async deleteUserData(telegramChatId: number): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userSchema.deleteOne({ telegramChatId });
    }

    protected async continueSendPushNotifications(telegramChatId: number): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userSchema.updateOne(
            { telegramChatId },
            { $set: { mute: false } }
        );
    }

    protected async stopSendPushNotifications(telegramChatId: number): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userSchema.updateOne(
            { telegramChatId },
            { $set: { mute: true } }
        );
    }
}