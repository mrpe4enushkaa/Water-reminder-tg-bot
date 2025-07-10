import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";

export class StartCommand extends Command {
    constructor(bot: TelegramBot) {
        super(bot);
    }

    public handle(): void {
        this.bot.onText(/^\/start$/, (message): void => {
            const chatId = message.chat.id;

            this.bot.sendMessage(chatId, prompts.start.welcome(message.chat.username), { parse_mode: "HTML" });
        });
    }
}