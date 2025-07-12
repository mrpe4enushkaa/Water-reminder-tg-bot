import TelegramBot from "node-telegram-bot-api";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";

export abstract class Command {
    constructor(
        protected bot: TelegramBot,
        protected waitingStates: Map<number, WaitingStates>,
        protected lastMessages: MessagesIdsTuple
    ) { }

    abstract handle(): void;
}