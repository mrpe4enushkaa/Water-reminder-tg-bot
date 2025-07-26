import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { RedisService } from "../databases/redis/redis.service";
import { UserData } from "../models/user-data.type";
import mongoose from "mongoose";
import { isValidUser } from "../utils/validators";
import { TranslateService } from "../translate/translate.service";
import { TimezoneService } from "../timezone/timezone.service";

export abstract class Command {
    private lifetime: number = 60 * 60 * 16;

    constructor(
        protected bot: TelegramBot,
        private userSchema: mongoose.Model<UserData>,
        private redis: RedisService,
        private translate: TranslateService,
        private timezone: TimezoneService
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
            time: enteredData.time ?? currentData?.time ?? undefined,
            goal: enteredData.goal ?? currentData?.goal ?? undefined,
            mute: enteredData.mute ?? currentData?.mute ?? false,
            timezone: enteredData.timezone ?? currentData?.timezone,
            city: enteredData.city ?? currentData?.city
        }

        await this.redis.set(`intermediate-user-data:${enteredData.telegramChatId}`, mergedData);
    }

    protected async getIntermediateUserData(telegramChatId: number): Promise<UserData> {
        const emptyData: UserData = {
            telegramChatId,
            weight: undefined,
            time: undefined,
            goal: undefined,
            mute: false,
            timezone: undefined,
            city: undefined
        }
        const data = await this.redis.get<UserData>(`intermediate-user-data:${telegramChatId}`);
        return !data ? emptyData : data;
    }

    protected async deleteIntermediateUserData(telegramChatId: number): Promise<void> {
        await this.redis.delete(`intermediate-user-data:${telegramChatId}`);
    }

    protected async addUserData(data: UserData): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserSchema' schema is not initialized");
        if (!isValidUser(data)) throw new Error("Invalid user data. All fields are required");
        await this.userSchema.create(data);
        await this.redis.set(`user-data:${data.telegramChatId}`, data, this.lifetime);
    }

    protected async getUserData(telegramChatId: number): Promise<UserData | undefined> {
        if (!this.userSchema) throw new Error("The 'UserSchema' schema is not initialized");
        const redis_data = await this.redis.get(`user-data:${telegramChatId}`);
        if (!redis_data) {
            const mongo_data = await this.userSchema.findOne({ telegramChatId });
            if (!mongo_data) {
                return undefined;
            }
            await this.redis.set(`user-data:${telegramChatId}`, mongo_data, this.lifetime);
            return mongo_data;
        }
        return redis_data;
    }

    protected async updateUserData(data: UserData): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserSchema' schema is not initialized");

        const currentData = await this.getUserData(data.telegramChatId);

        if (!currentData) {
            throw new Error("User data hasn't been added");
        }

        const mergedData: UserData = {
            telegramChatId: data.telegramChatId ?? currentData?.telegramChatId,
            weight: data.weight ?? currentData?.weight,
            time: data.time ?? currentData?.time,
            goal: data.goal ?? currentData?.goal,
            mute: data.mute ?? currentData?.mute,
            timezone: data.timezone ?? currentData?.timezone,
            city: data.city ?? currentData?.city
        }

        await this.userSchema.updateOne(
            { telegramChatId: mergedData.telegramChatId },
            { $set: mergedData }
        );
        await this.redis.set(`user-data:${mergedData.telegramChatId}`, mergedData, this.lifetime);
    }

    protected async deleteUserData(telegramChatId: number): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userSchema.deleteOne({ telegramChatId });
        await this.redis.delete(`user-data:${telegramChatId}`);
    }

    protected async continueSendPushNotifications(telegramChatId: number): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userSchema.updateOne(
            { telegramChatId },
            { $set: { mute: false } }
        );
        const userData = await this.userSchema.findOne({ telegramChatId });
        if (userData) await this.redis.set(`user-data:${telegramChatId}`, userData, this.lifetime);
    }

    protected async stopSendPushNotifications(telegramChatId: number): Promise<void> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        await this.userSchema.updateOne(
            { telegramChatId },
            { $set: { mute: true } }
        );
        const userData = await this.userSchema.findOne({ telegramChatId });
        if (userData) await this.redis.set(`user-data:${telegramChatId}`, userData, this.lifetime);
    }

    protected async getAllUserData(): Promise<UserData[]> {
        if (!this.userSchema) throw new Error("The 'UserScheme' schema is not initialized");
        const allData = await this.userSchema.find();
        return allData;
    }

    // public isCurrentTimeMatch(timezone: string, hour: number, minute: number): boolean {
    //     const now = DateTime.now().setZone(timezone);
    //     return now.hour === hour && now.minute === minute;
    // }
    // isCurrentTimeMatch(timezone: string, hour: number, minute: number): boolean;

    protected async getTimezone(city: string): Promise<string | undefined> {
        const translated = await this.translate.translation(city);
        const timezone = await this.timezone.getTimezone(translated);
        return timezone;
    }
}