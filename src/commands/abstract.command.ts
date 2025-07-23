import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { RedisService } from "../databases/redis/redis.service";

export abstract class Command {
    constructor(
        protected bot: TelegramBot,
        protected userProvidedData: Map<number, UserProvidedData>,
        protected redis: RedisService
    ) { }

    abstract handle(): void;


    protected async setWaitingState(chatId: number, state: WaitingStates): Promise<void> {
        await this.redis.set(`waiting-state:${chatId}`, state);
    }

    protected async getWaitingState(chatId: number): Promise<WaitingStates | undefined> {
        const data = await this.redis.get(`waiting-state:${chatId}`);
        if (!data) return undefined;
        const state = parseInt(data);
        return isNaN(state) ? undefined : state;
    }

    protected async deleteWaitingState(chatId: number): Promise<void> {
        await this.redis.delete(`waiting-state:${chatId}`);
    }

    protected async setTrackedMessages(chatId: number, id: MessagesIdsTuple): Promise<void> {
        const data: Record<string, string> = {
            firstMessageId: String(id[0]),
            secondMessageId: String(id[1])
        }
        await this.redis.hset(`tracked-messages:${chatId}`, data);
    }

    protected async getTrackedMessages(chatId: number): Promise<MessagesIdsTuple> {
        const data = await this.redis.hget(`tracked-messages:${chatId}`);
        let firstMessageId: number | undefined = parseInt(data.firstMessageId);
        let secondMessageId: number | undefined = parseInt(data.secondMessageId);
        if (isNaN(firstMessageId)) firstMessageId = undefined;
        if (isNaN(secondMessageId)) secondMessageId = undefined;
        return [firstMessageId, secondMessageId];
    }

    protected async deleteTrackedMessages(chatId: number): Promise<void> {
        await this.redis.delete(`tracked-messages:${chatId}`);
    }

    protected async setEditParametersFlag(chatId: number): Promise<void> {
        await this.redis.sadd(`edit-parameters`, chatId);
    }

    protected async hasEditParametersFlag(chatId: number): Promise<boolean> {
        const data = await this.redis.sismember(`edit-parameters`, chatId);
        return data === 1;
    }

    protected async clearEditParametersFlag(chatId: number): Promise<void> {
        await this.redis.sremove(`edit-parameters`, chatId);
    }
}