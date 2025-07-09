import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";

export class StartCommand extends Command {
    constructor(bot: TelegramBot) {
        super(bot);
    }

    public handle(): void {
        this.bot.onText(/^\/start$/, (message): void => {
            const chatId = message.chat.id;

            this.bot.sendMessage(chatId, `<b>Привет, ${message.chat.username}!</b> 👋
                \nЭтот бот поможет тебе контролировать водный баланс 💧
                \nЧтобы рассчитать норму воды по твоему весу и включить напоминания — введи команду:
                \n/add_parameters`, { parse_mode: "HTML" });
        });
    }
}