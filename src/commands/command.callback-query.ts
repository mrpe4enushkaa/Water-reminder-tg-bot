import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../models/callback-data.enum";
import { prompts } from "../utils/prompts";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { inlineKeyboardCancel, inlineKeyboardContinue } from "../utils/reply-markups";
import { UserProvidedData } from "../models/user-provided-data.type";
import { RedisService } from "../databases/redis/redis.service";

export class CallbackQueryCommand extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>,
        editUserParameters: Set<number>,
        userProvidedData: Map<number, UserProvidedData>,
        redis: RedisService
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue, editUserParameters, userProvidedData, redis);
    }

    public handle(): void {
        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const data = query?.data;

            if (typeof data === "string" && typeof chatId !== "undefined" && this.waitingStates.has(chatId)) {
                const trackedMessages = this.getLastMessages(chatId);

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

                    this.waitingStates.delete(chatId);
                    this.notificationQueue.delete(chatId);
                    this.clearLastMessages(chatId);
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

                    this.clearLastMessages(chatId);
                    this.notificationQueue.delete(chatId);
                    this.waitingStates.delete(chatId);
                }

                if (data === CallbackData.CONTINUE) {
                    const state = this.waitingStates.get(chatId);

                    if (typeof state !== "undefined") {
                        const nextState = state + 1;

                        if (nextState) {
                            const trackedMessages = this.getLastMessages(chatId);

                            if (typeof trackedMessages[1] !== "undefined") {
                                this.bot.deleteMessage(chatId, trackedMessages[1]);
                            }

                            if (nextState > 3) {
                                const userParameters = this.userProvidedData.get(chatId);

                                if (userParameters &&
                                    typeof userParameters.weight === "undefined" &&
                                    typeof userParameters.city === "undefined" &&
                                    userParameters.time.every(value => typeof value === "undefined")) {
                                    this.bot.editMessageText(prompts.editParameters.cancel, {
                                        chat_id: chatId,
                                        message_id: trackedMessages[0],
                                        parse_mode: "HTML"
                                    });
                                } else {
                                    if (typeof userParameters !== "undefined") {
                                        this.bot.editMessageText(prompts.editParameters.confirm(userParameters), {
                                            chat_id: chatId,
                                            message_id: trackedMessages[0],
                                            parse_mode: "HTML"
                                        });
                                    }
                                }
                                this.redis.sremove("edit-parameters", chatId.toString());
                                this.waitingStates.delete(chatId);
                                this.clearLastMessages(chatId);
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
                                    }).then(lastMessage => {
                                        const message = lastMessage as TelegramBot.Message;
                                        this.setLastMessages(chatId, [message.message_id, undefined]);
                                    });

                                    this.waitingStates.set(chatId, nextState);
                                    this.clearLastMessages(chatId);
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
                                    }).then(lastMessage => {
                                        const message = lastMessage as TelegramBot.Message;
                                        this.setLastMessages(chatId, [message.message_id, undefined]);
                                    });

                                    this.waitingStates.set(chatId, nextState);
                                    this.clearLastMessages(chatId);
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