import TelegramBot from "node-telegram-bot-api";

export abstract class Command {
    constructor(protected bot: TelegramBot, protected waitingForWeight: Set<number>) { }

    abstract handle(): void;
}