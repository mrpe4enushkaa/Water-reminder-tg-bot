import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { UserProvidedData } from "../models/user-provided-data.type";
import { prompts } from "../utils/prompts";
import { RedisService } from "../databases/redis/redis.service";

export class TimeCommand extends Command {
    constructor(
        bot: TelegramBot,
        userProvidedData: Map<number, UserProvidedData>,
        redis: RedisService
    ) {
        super(bot, userProvidedData, redis);
    }

    public handle(): void {
        this.bot.onText(/^\/time$/, async (message): Promise<void> => {
            const chatId = message.chat.id;

            if (await this.getWaitingState(chatId)) return;

            this.bot.sendMessage(chatId, prompts.time("0ч"), { // edit 0ч
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true
                }
            });
        });
    }
}