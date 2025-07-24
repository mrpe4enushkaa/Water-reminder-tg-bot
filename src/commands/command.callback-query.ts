import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../models/callback-data.enum";
import { prompts } from "../utils/prompts";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { inlineKeyboardCancel, inlineKeyboardContinue } from "../utils/reply-markups";
import { RedisService } from "../databases/redis/redis.service";
import { UserData } from "../models/user-data.type";
import mongoose from "mongoose";

export class CallbackQueryCommand extends Command {
    constructor(
        bot: TelegramBot,
        userSchema: mongoose.Model<UserData>,
        redis: RedisService
    ) {
        super(bot, userSchema, redis);
    }

    public handle(): void {
        this.bot.on("callback_query", async (query): Promise<void> => {
            const chatId = query.message?.chat.id;
            const data = query?.data;

            if (typeof data === "string" && typeof chatId !== "undefined") {
                const trackedMessages = await this.getTrackedMessages(chatId);

                if (data === CallbackData.CANCEL_ADD) {
                    if (typeof trackedMessages[0] !== "undefined") {
                        this.bot.editMessageText(prompts.cancel, {
                            chat_id: chatId,
                            message_id: trackedMessages[0],
                            parse_mode: "HTML"
                        });
                    }
                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[1]);
                    }

                    await this.deleteWaitingState(chatId);
                    await this.deleteTrackedMessages(chatId);
                    await this.clearEditParametersFlag(chatId);
                }

                if (data === CallbackData.SNOOZE) {
                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.editMessageText(prompts.drinkWater.clickedSnooze, {
                            chat_id: chatId,
                            message_id: trackedMessages[1]
                        });
                    }
                    if (typeof trackedMessages[0] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[0]);
                    }

                    await this.deleteTrackedMessages(chatId);
                    await this.deleteWaitingState(chatId);
                }

                if (data === CallbackData.CONTINUE) {
                    const state = await this.getWaitingState(chatId);

                    if (typeof state !== "undefined") {
                        const nextState = state + 1;

                        if (nextState) {
                            const trackedMessages = await this.getTrackedMessages(chatId);

                            if (typeof trackedMessages[1] !== "undefined") {
                                this.bot.deleteMessage(chatId, trackedMessages[1]);
                            }

                            if (nextState > 3) {
                                let intermediateUserData = await this.getIntermediateUserData(chatId);

                                if (intermediateUserData &&
                                    typeof intermediateUserData.weight === "undefined" &&
                                    typeof intermediateUserData.city === "undefined" &&
                                    typeof intermediateUserData.time === "undefined") {
                                    this.bot.editMessageText(prompts.editParameters.cancel, {
                                        chat_id: chatId,
                                        message_id: trackedMessages[0],
                                        parse_mode: "HTML"
                                    });
                                } else {
                                    await this.updateUserData(intermediateUserData);
                                    const userData = await this.getUserData(chatId);
                                    console.log(userData);
                                    if (typeof userData !== "undefined") {
                                        this.bot.editMessageText(prompts.editParameters.confirm(userData), {
                                            chat_id: chatId,
                                            message_id: trackedMessages[0],
                                            parse_mode: "HTML"
                                        });
                                    }
                                }

                                await this.deleteIntermediateUserData(chatId);
                                await this.clearEditParametersFlag(chatId);
                                await this.deleteWaitingState(chatId);
                                await this.deleteTrackedMessages(chatId);
                                return;
                            }

                            switch (nextState) {
                                case WaitingStates.CITY:
                                    this.bot.editMessageText(prompts.editParameters.city, {
                                        chat_id: chatId,
                                        message_id: trackedMessages[0],
                                        reply_markup: {
                                            inline_keyboard: [
                                                ...inlineKeyboardContinue.reply_markup.inline_keyboard,
                                                ...inlineKeyboardCancel.reply_markup.inline_keyboard
                                            ]
                                        },
                                        parse_mode: "HTML"
                                    }).then(async (lastMessage): Promise<void> => {
                                        const message = lastMessage as TelegramBot.Message;
                                        await this.setTrackedMessages(chatId, [message.message_id, undefined]);
                                    });

                                    await this.setWaitingState(chatId, nextState);
                                    break;
                                case WaitingStates.TIME:
                                    this.bot.editMessageText(prompts.editParameters.time, {
                                        chat_id: chatId,
                                        message_id: trackedMessages[0],
                                        reply_markup: {
                                            inline_keyboard: [
                                                ...inlineKeyboardContinue.reply_markup.inline_keyboard,
                                                ...inlineKeyboardCancel.reply_markup.inline_keyboard
                                            ]
                                        },
                                        parse_mode: "HTML"
                                    }).then(async (lastMessage): Promise<void> => {
                                        const message = lastMessage as TelegramBot.Message;
                                        await this.setTrackedMessages(chatId, [message.message_id, undefined]);
                                    });

                                    await this.setWaitingState(chatId, nextState);
                                    break;
                            }
                        }
                    }
                    return;
                }
            }
        });
    }
}