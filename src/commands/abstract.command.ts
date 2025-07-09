import TelegramBot from "node-telegram-bot-api";

export abstract class Command {
    constructor(protected bot: TelegramBot) { }

    abstract handle(): void;
}