import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";

export abstract class Command {
    constructor(
        protected bot: TelegramBot,
        protected waitingStates: Map<number, WaitingStates>,
        protected lastMessages: Map<number, MessagesIdsTuple>
    ) { }

    abstract handle(): void;

    protected getLastMessages(chatId: number): MessagesIdsTuple {
        return this.lastMessages.get(chatId) || [undefined, undefined];
    }

    protected setLastMessages(chatId: number, tuple: MessagesIdsTuple): void {
        this.lastMessages.set(chatId, tuple);
    }

    protected clearLastMessages(chatId: number): void {
        this.lastMessages.set(chatId, [undefined, undefined]);
    }
}