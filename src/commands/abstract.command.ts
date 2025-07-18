import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { UserProvidedData } from "../models/user-provided-data.type";

export abstract class Command {
    constructor(
        protected bot: TelegramBot,
        protected waitingStates: Map<number, WaitingStates>,
        private lastMessages: Map<number, MessagesIdsTuple>,
        protected notificationQueue: Set<number>,
        protected editUserParameters: Set<number>,
        protected userProvidedData: Map<number, UserProvidedData>
    ) { }

    abstract handle(): void;

    protected getLastMessages(chatId: number): MessagesIdsTuple {
        return this.lastMessages.get(chatId) || [undefined, undefined];
    }

    protected setLastMessages(chatId: number, lastMessagesTuple: MessagesIdsTuple): void {
        this.lastMessages.set(chatId, lastMessagesTuple);
    }

    protected clearLastMessages(chatId: number): void {
        this.lastMessages.set(chatId, [undefined, undefined]);
    }
}