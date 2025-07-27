import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { RedisService } from "../databases/redis/redis.service";
import { UserData } from "../models/user-data.type";
import mongoose from "mongoose";
import { isValidUser } from "../utils/validators";
import { TranslateService } from "../translate/translate.service";
import { TimezoneService } from "../timezone/timezone.service";
import { TimeService } from "../time/time.service";
import { Goals } from "../models/goals.type";

export abstract class Command {
    private lifetime: number = 60 * 60 * 16;

    constructor(
        protected bot: TelegramBot,
        private userSchema: mongoose.Model<UserData>,
        private redis: RedisService,
        private translate: TranslateService,
        private time: TimeService,
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
            username: enteredData.username ?? currentData?.username,
            weight: enteredData.weight ?? currentData?.weight ?? undefined,
            city: enteredData.city ?? currentData?.city ?? undefined,
            timezone: enteredData.timezone ?? currentData?.timezone ?? undefined,
            time: enteredData.time ?? currentData?.time ?? undefined,
            goal: enteredData.goal ?? currentData?.goal ?? undefined,
            mute: enteredData.mute ?? currentData?.mute ?? false,
        }

        await this.redis.set(`intermediate-user-data:${enteredData.telegramChatId}`, mergedData);
    }

    protected async getIntermediateUserData(telegramChatId: number): Promise<UserData> {
        const emptyData: UserData = {
            telegramChatId,
            username: undefined,
            weight: undefined,
            city: undefined,
            timezone: undefined,
            time: undefined,
            goal: undefined,
            mute: false,
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
            username: data.username ?? currentData?.username,
            weight: data.weight ?? currentData?.weight,
            city: data.city ?? currentData?.city,
            timezone: data.timezone ?? currentData?.timezone,
            time: data.time ?? currentData?.time,
            goal: data.goal ?? currentData?.goal,
            mute: data.mute ?? currentData?.mute,
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

    protected async setSchedule(telegramChatId: number, timezone: string, goal: number, time: [string, string]): Promise<void> {
        const portionsCount = Math.ceil(goal / 0.200);
        const [wakeHour, wakeMinute] = time[0].split(":").map(Number);
        const [sleepHour, sleepMinute] = time[1].split(":").map(Number);

        const newWakeHour = wakeHour + 1;

        const today = this.time.getToday(timezone);

        const wakeTime = today.set({ hour: newWakeHour, minute: wakeMinute });
        const sleepTime = today.set({ hour: sleepHour, minute: sleepMinute });

        const minutes = this.time.getDiff(wakeTime, sleepTime);
        const interval = Math.floor(minutes / portionsCount);

        const times: string[] = [];

        for (let i = 0; i < portionsCount; i++) {
            const t = wakeTime.plus({ minutes: i * interval }).toFormat("HH:mm");
            times.push(t);
        }

        await this.redis.set(`schedule:${telegramChatId}`, times);
    }

    protected async getSchedule(telegramChatId: number): Promise<string[]> {
        const times = await this.redis.get(`schedule:${telegramChatId}`);
        return times;
    }

    protected async updateSchedule(telegramChatId: number, timezone: string, timeSnooze: string) {
        const today = this.time.getToday(timezone);
        let [hour, minute] = timeSnooze.split(":").map(Number);

        minute += 7;

        if (minute >= 60) {
            minute -= 60;
            hour++;

            if (hour >= 24) {
                hour -= 24;
            }
        }

        const newTime = today.set({ hour, minute }).toFormat("HH:mm");

        const times: string[] = await this.getSchedule(telegramChatId);

        const updated = times.map(time => (time === timeSnooze ? newTime : time));

        await this.redis.set(`schedule:${telegramChatId}`, updated);
    }

    protected async deleteSchedule(telegramChatId: number): Promise<void> {
        await this.redis.delete(`schedule:${telegramChatId}`);
    }

    protected async setGoals(telegramChatId: number, minus: number = 0): Promise<void> {
        const data = await this.getUserData(telegramChatId);
        if (!data) return console.error("No user data");
        if (typeof data.goal !== "undefined") {
            const goals: Goals = { goal: data.goal, currentGoal: data.goal - minus }
            await this.redis.set(`goals:${telegramChatId}`, goals);
        }
    }

    protected async getGoals(telegramChatId: number): Promise<Goals> {
        const data = await this.redis.get(`goals:${telegramChatId}`);
        if (!data) {
            await this.setGoals(telegramChatId);
            const newData = await this.redis.get(`goals:${telegramChatId}`);
            return newData;
        }
        return data;
    }

    protected async deleteGoals(telegramChatId: number) {
        await this.redis.delete(`goals:${telegramChatId}`);
    }

    protected async getTimezone(city: string): Promise<string | undefined> {
        const translated = await this.translate.translation(city);
        const timezone = await this.timezone.getTimezone(translated);
        return timezone;
    }

    protected async isCurrentTime(): Promise<void> {

    }
}