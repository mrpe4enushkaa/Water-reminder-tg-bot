import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { keyboardVolumeOptions, inlineKeyboardSnooze } from "../utils/reply-markups";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isValidVolume } from "../utils/validators";
import { RedisService } from "../databases/redis/redis.service";
import mongoose from "mongoose";
import { UserData } from "../models/user-data.type";

export class DrinkWaterCommand extends Command {
    private messageVolume = (chatId: number, volume: number): Promise<TelegramBot.Message> =>
        this.bot.sendMessage(chatId, prompts.drinkWater.add(volume), {
            parse_mode: "HTML"
        });

    private messageSnooze = (chatId: number, trackedMessages: MessagesIdsTuple): Promise<number | void> => this.bot.sendMessage(chatId, prompts.drinkWater.snooze, { parse_mode: "HTML", ...inlineKeyboardSnooze })
        .then(async (lastMessage): Promise<void> => {
            trackedMessages[1] = lastMessage.message_id;
            await this.setTrackedMessages(chatId, trackedMessages);
        });

    constructor(
        bot: TelegramBot,
        userSchema: mongoose.Model<UserData>,
        redis: RedisService
    ) {
        super(bot, userSchema, redis);
    }

    public handle(): void {
        this.bot.onText(/^\/drink$/, async (message): Promise<void> => {
            const chatId = message.chat.id;

            if (await this.getWaitingState(chatId)) return;

            const trackedMessages = await this.getTrackedMessages(chatId);

            await this.setWaitingState(chatId, WaitingStates.DRINK);

            this.startMessage(chatId, trackedMessages, prompts.drinkWater.timeToDrink, {
                ...keyboardVolumeOptions,
                parse_mode: "HTML"
            });
        });

        this.bot.on("message", async (message): Promise<void> => {
            const chatId = message.chat.id;
            const text = message.text || "";

            if (await this.getWaitingState(chatId) === WaitingStates.DRINK || await this.getWaitingState(chatId) === WaitingStates.CHOICE) {
                if (text === prompts.drinkWater.keyboardChoice) {
                    const trackedMessages = await this.getTrackedMessages(chatId);

                    await this.setWaitingState(chatId, WaitingStates.CHOICE);

                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[1]);
                        await this.deleteTrackedMessages(chatId);
                    }

                    this.bot.sendMessage(chatId, prompts.drinkWater.choice, {
                        reply_markup: {
                            remove_keyboard: true
                        },
                        parse_mode: "HTML"
                    }).then(lastMessage => {
                        trackedMessages[0] = lastMessage.message_id;
                        this.messageSnooze(chatId, trackedMessages);
                    });
                }

                switch (await this.getWaitingState(chatId)) {
                    case WaitingStates.DRINK:
                        await this.keyboardChoiseWater(chatId, message);
                        break;
                    case WaitingStates.CHOICE:
                        await this.userChoiseWater(chatId, message);
                        break;
                }
            }
        });
    }

    private startMessage(chatId: number, trackedMessages: MessagesIdsTuple, text: string, options?: TelegramBot.SendMessageOptions): void {
        this.bot.sendMessage(chatId, text, {
            parse_mode: "HTML",
            ...options
        }).then(lastMessage => {
            trackedMessages[0] = lastMessage.message_id;
            this.messageSnooze(chatId, trackedMessages);
        });
    }

    private async keyboardChoiseWater(chatId: number, message: TelegramBot.Message): Promise<void> {
        const text = message?.text || "";
        const trackedMessages = await this.getTrackedMessages(chatId);

        if (!isValidVolume(text)) {
            this.bot.deleteMessage(chatId, message.message_id);

            if (typeof trackedMessages[1] !== "undefined") {
                this.bot.editMessageText(`${prompts.drinkWater.error}
                \n${prompts.drinkWater.snooze}`, {
                    chat_id: chatId,
                    message_id: trackedMessages[1],
                    reply_markup: inlineKeyboardSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup,
                    parse_mode: "HTML"
                }).catch(() => { });
            }
            return;
        }

        const volume = parseFloat(text);

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        this.messageVolume(chatId, volume);

        await this.deleteWaitingState(chatId);
        await this.deleteTrackedMessages(chatId);
    }

    private async userChoiseWater(chatId: number, message: TelegramBot.Message): Promise<void> {
        const text = message.text || "";
        const trackedMessages = await this.getTrackedMessages(chatId);

        if (!isValidVolume(text)) {
            if (text !== prompts.drinkWater.keyboardChoice && typeof trackedMessages[1] !== "undefined") {
                this.bot.deleteMessage(chatId, message.message_id);
                this.bot.editMessageText(`${prompts.drinkWater.error}
                \n${prompts.drinkWater.snooze}`, {
                    chat_id: chatId,
                    message_id: trackedMessages[1],
                    reply_markup: inlineKeyboardSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup,
                    parse_mode: "HTML"
                }).catch(() => { });
            }
            return;
        }

        const volume = parseFloat(text);

        this.messageVolume(chatId, volume);

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        await this.deleteWaitingState(chatId);
        await this.deleteTrackedMessages(chatId);
    }

    private async updateWaterGoal(): Promise<void> {

    }
}