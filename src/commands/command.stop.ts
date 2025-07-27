import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { inlineKeyboardCancel } from "../utils/reply-markups";
import { prompts } from "../utils/prompts";
import { RedisService } from "../databases/redis/redis.service";
import mongoose from "mongoose";
import { UserData } from "../models/user-data.type";
import { TranslateService } from "../translate/translate.service";
import { TimezoneService } from "../timezone/timezone.service";
import { TimeService } from "../time/time.service";

export class StopCommand extends Command {
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
        this.bot.onText(/^\/stop$/, async (message): Promise<void> => {
            const chatId = message.chat.id;

            if (await this.getWaitingState(chatId)) return;

            const userData = await this.getUserData(chatId);

            if (!userData) {
                this.bot.sendMessage(chatId, prompts.stop.need);
                return;
            }

            if (userData.mute) {
                this.bot.sendMessage(chatId, prompts.stop.statement);
                return;
            }

            await this.setWaitingState(chatId, WaitingStates.STOP);

            this.bot.sendMessage(chatId, prompts.stop.ask, {
                ...inlineKeyboardCancel,
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true,
                    ...inlineKeyboardCancel.reply_markup
                }
            }).then(async (lastMessage): Promise<void> =>
                await this.setTrackedMessages(chatId, [lastMessage.message_id, undefined]));
        });

        this.bot.on("message", async (message): Promise<void> => {
            const chatId = message.chat.id;
            const text = message.text || "";

            if (await this.getWaitingState(chatId) === WaitingStates.STOP) {
                if (text.toLocaleLowerCase() !== "остановить") {
                    this.bot.deleteMessage(chatId, message.message_id);
                    return;
                }

                const trackedMessages = await this.getTrackedMessages(chatId);

                await this.stopSendPushNotifications(chatId);

                if (typeof trackedMessages[0] !== "undefined") {
                    this.bot.editMessageText(prompts.stop.ask, {
                        chat_id: chatId,
                        message_id: trackedMessages[0],
                        parse_mode: "HTML"
                    });
                }

                this.bot.sendMessage(chatId, prompts.stop.stopped, {
                    parse_mode: "HTML"
                });

                await this.deleteWaitingState(chatId);
                await this.deleteTrackedMessages(chatId);
            }
        });
    }
}