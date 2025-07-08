import TelegramBot from "node-telegram-bot-api";
import { Command } from "./command.main";

export class StartCommand extends Command {
    constructor(bot: TelegramBot) {
        super(bot);
    }

    handle(): void {
        this.bot.onText(/^\/start$/, (message): void => {
            this.bot.sendMessage(message.chat.id, `Hello ${message.chat.username}`);
        });
    }
}