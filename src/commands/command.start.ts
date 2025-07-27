import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { RedisService } from "../databases/redis/redis.service";
import mongoose from "mongoose";
import { UserData } from "../models/user-data.type";
import { TimezoneService } from "../timezone/timezone.service";
import { TranslateService } from "../translate/translate.service";
import { TimeService } from "../time/time.service";

export class StartCommand extends Command {
    constructor(
        bot: TelegramBot,
        userSchema: mongoose.Model<UserData>,
        redis: RedisService,
        translate: TranslateService,
        time: TimeService,
        timezone: TimezoneService
    ) {
        super(bot, userSchema, redis, translate, time, timezone);
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