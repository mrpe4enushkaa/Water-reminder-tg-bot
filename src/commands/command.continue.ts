import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { RedisService } from "../databases/redis/redis.service";
import mongoose from "mongoose";
import { UserData } from "../models/user-data.type";

export class ContinueCommand extends Command {
    constructor(
        bot: TelegramBot,
        userSchema: mongoose.Model<UserData>,
        redis: RedisService
    ) {
        super(bot, userSchema, redis);
    }

    public handle(): void {
        this.bot.onText(/^\/continue$/, async (message): Promise<void> => {
            const chatId = message.chat.id;
            
            if (await this.getWaitingState(chatId)) return;

            const userData = await this.getUserData(chatId);

            if (!userData) {
                this.bot.sendMessage(chatId, "Чтобы продолжить отправку уведомлений, добавьте данные)");
                return;
            }
            console.log(userData.mute)
            await this.continueSendPushNotifications(chatId);

            this.bot.sendMessage(chatId, prompts.continue, {
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true
                }
            });
        });
    }
}