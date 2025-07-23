import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { UserProvidedData } from "../models/user-provided-data.type";
import { RedisService } from "../databases/redis/redis.service";

export class StartCommand extends Command {
    constructor(
        bot: TelegramBot,
        userProvidedData: Map<number, UserProvidedData>,
        redis: RedisService
    ) {
        super(bot, userProvidedData, redis);
    }

    public handle(): void {
        this.bot.onText(/^\/start$/, async (message): Promise<void> => {
            const chatId = message.chat.id;
            
            if (await this.getWaitingState(chatId)) return;

            this.bot.sendMessage(chatId, prompts.start.welcome(message.chat.username), {
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true
                }
            });
        });
    }
}