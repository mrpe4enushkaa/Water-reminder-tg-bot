import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { RedisService } from "../databases/redis/redis.service";
import mongoose from "mongoose";
import { UserData } from "../models/user-data.type";
import { TranslateService } from "../translate/translate.service";
import { TimezoneService } from "../timezone/timezone.service";
import { TimeService } from "../time/time.service";

export class TimeCommand extends Command {
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
        this.bot.onText(/^\/time$/, async (message): Promise<void> => {
            const chatId = message.chat.id;

            if (await this.getWaitingState(chatId)) return;

            const userData = await this.getUserData(chatId);

            if (!userData) {
                this.bot.sendMessage(chatId, prompts.time.need);
                return;
            }

            this.bot.sendMessage(chatId, prompts.time.to("0ч"), { // edit 0ч
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true
                }
            });
        });
    }
}