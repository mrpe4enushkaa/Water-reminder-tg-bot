import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { isValidWeight, isValidCity, isValidTime, isValidUser } from "../utils/validators";
import { prompts } from "../utils/prompts";
import { inlineKeyboardCancel, inlineKeyboardContinue } from "../utils/reply-markups";
import { RedisService } from "../databases/redis/redis.service";
import mongoose from "mongoose";
import { UserData } from "../models/user-data.type";

export class ParametersCommand extends Command {
    constructor(
        bot: TelegramBot,
        userSchema: mongoose.Model<UserData>,
        redis: RedisService,
    ) {
        super(bot, userSchema, redis);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, async (message): Promise<void> => {
            const chatId = message.chat.id;
            const userData = await this.getUserData(chatId);

            if (userData) {
                this.bot.sendMessage(chatId, "Вам не нужно добавлят данные");
                return;
            }

            await this.startMessage(chatId);
        });

        this.bot.onText(/^\/edit_parameters$/, async (message): Promise<void> => {
            const chatId = message.chat.id;
            const userData = await this.getUserData(chatId);

            if (!userData) {
                this.bot.sendMessage(chatId, "Чтобы изменять данные, их нужно добавить)");
                return;
            }

            await this.setEditParametersFlag(chatId);
            await this.startMessage(chatId);
        });

        this.bot.onText(/^\/delete_parameters$/, async (message): Promise<void> => {
            const chatId = message.chat.id;

            if (await this.getWaitingState(chatId)) return;

            const userData = await this.getUserData(chatId);

            if (!userData) {
                this.bot.sendMessage(chatId, "Чтобы удалить данные, их нужно добавить)");
                return;
            }

            await this.setWaitingState(chatId, WaitingStates.DELETE);

            this.bot.sendMessage(chatId, prompts.deleteParameters.confirm, {
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true,
                    ...inlineKeyboardCancel.reply_markup
                }
            }).then(async (lastMessage): Promise<void> =>
                await this.setTrackedMessages(chatId, [lastMessage.message_id, undefined]));
        });

        this.bot.onText(/^\/info_parameters$/, async (message): Promise<void> => {
            const chatId = message.chat.id;

            if (await this.getWaitingState(chatId)) return;

            const userData = await this.getUserData(chatId);

            if (typeof userData === "undefined") {
                this.bot.sendMessage(chatId, "Добавьте свою информацию, чтобы просмотреть ее", {
                    parse_mode: "HTML",
                    reply_markup: {
                        remove_keyboard: true
                    }
                });
                return;
            }

            this.bot.sendMessage(chatId, prompts.info_parameters(userData), {
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true
                }
            });
        });

        this.bot.on("message", async (message): Promise<void> => {
            const chatId = message.chat.id;

            switch (await this.getWaitingState(chatId)) {
                case WaitingStates.WEIGHT:
                    await this.handleWeight(chatId, message);
                    break;
                case WaitingStates.CITY:
                    await this.handleCity(chatId, message);
                    break;
                case WaitingStates.TIME:
                    await this.handleTime(chatId, message);
                    break;
                case WaitingStates.DELETE:
                    return this.handleDelete(chatId, message);
            }
        });
    }

    private async startMessage(chatId: number): Promise<void> {
        if (await this.getWaitingState(chatId)) return;

        await this.setWaitingState(chatId, WaitingStates.WEIGHT);

        const trackedMessages = await this.getTrackedMessages(chatId);
        const editFlag = await this.hasEditParametersFlag(chatId);

        this.bot.sendMessage(chatId, editFlag ? prompts.editParameters.weight : prompts.addParameters.weight, {
            reply_markup: {
                inline_keyboard: [
                    ...(editFlag ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                    ...inlineKeyboardCancel.reply_markup.inline_keyboard
                ],
                remove_keyboard: true
            },
            parse_mode: "HTML"
        }).then(async (lastMessage): Promise<void> => {
            trackedMessages[0] = lastMessage.message_id;
            await this.setTrackedMessages(chatId, trackedMessages);
        });
    }

    private async handleWeight(chatId: number, message: TelegramBot.Message): Promise<void> {
        let trackedMessages = await this.getTrackedMessages(chatId);
        const editFlag = await this.hasEditParametersFlag(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(editFlag ? prompts.editParameters.weight : prompts.addParameters.weight, {
                chat_id: chatId,
                message_id: trackedMessages[0],
                parse_mode: "HTML"
            });
        }

        const text = message?.text?.trim() || "";
        const weight = parseFloat(text);

        if (!isValidWeight(text)) {
            this.bot.deleteMessage(chatId, message.message_id);
            if (typeof trackedMessages[1] === "undefined") {
                this.bot.sendMessage(chatId, prompts.addParameters.correctWeight, {
                    reply_markup: {
                        inline_keyboard: [
                            ...(editFlag ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                            ...inlineKeyboardCancel.reply_markup.inline_keyboard
                        ]
                    },
                    parse_mode: "HTML",
                    disable_notification: true
                }).then(async (lastMessage): Promise<void> => {
                    trackedMessages[1] = lastMessage.message_id;
                    await this.setTrackedMessages(chatId, trackedMessages);
                });
            }
            return;
        }

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        await this.setWaitingState(chatId, WaitingStates.CITY);

        await this.deleteTrackedMessages(chatId);
        trackedMessages = await this.getTrackedMessages(chatId);

        await this.setIntermediateUserData({
            telegramChatId: chatId,
            weight: weight,
            city: undefined,
            time: undefined,
            goal: parseFloat((weight * 0.035).toFixed(2)),
            mute: false
        });

        this.bot.sendMessage(chatId, editFlag ? prompts.editParameters.city : prompts.addParameters.city, {
            reply_markup: {
                inline_keyboard: [
                    ...(editFlag ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                    ...inlineKeyboardCancel.reply_markup.inline_keyboard
                ]
            },
            parse_mode: "HTML"
        }).then(async (lastMessage): Promise<void> => {
            trackedMessages[0] = lastMessage.message_id;
            await this.setTrackedMessages(chatId, trackedMessages);
        });;
    }

    private async handleCity(chatId: number, message: TelegramBot.Message): Promise<void> {
        let trackedMessages = await this.getTrackedMessages(chatId);
        const editFlag = await this.hasEditParametersFlag(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(editFlag ? prompts.editParameters.city : prompts.addParameters.city, {
                chat_id: chatId,
                message_id: trackedMessages[0],
                parse_mode: "HTML"
            });
        }

        const text = message?.text || "";

        if (!isValidCity(text)) {
            this.bot.deleteMessage(chatId, message.message_id);
            if (typeof trackedMessages[1] === "undefined") {
                this.bot.sendMessage(chatId, prompts.addParameters.correctCity, {
                    reply_markup: {
                        inline_keyboard: [
                            ...(editFlag ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                            ...inlineKeyboardCancel.reply_markup.inline_keyboard
                        ]
                    },
                    parse_mode: "HTML",
                    disable_notification: true
                }).then(async (lastMessage): Promise<void> => {
                    trackedMessages[1] = lastMessage.message_id;
                    await this.setTrackedMessages(chatId, trackedMessages);
                });
            }
            return;
        }

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        await this.setWaitingState(chatId, WaitingStates.TIME);

        await this.deleteTrackedMessages(chatId);
        trackedMessages = await this.getTrackedMessages(chatId);

        const intermediateUserData = await this.getIntermediateUserData(chatId);

        await this.setIntermediateUserData({
            telegramChatId: intermediateUserData.telegramChatId,
            weight: intermediateUserData.weight,
            city: text,
            time: intermediateUserData.time,
            goal: intermediateUserData.goal,
            mute: intermediateUserData.mute
        });

        this.bot.sendMessage(chatId, editFlag ? prompts.editParameters.time : prompts.addParameters.time, {
            reply_markup: {
                inline_keyboard: [
                    ...(editFlag ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                    ...inlineKeyboardCancel.reply_markup.inline_keyboard
                ]
            },
            parse_mode: "HTML"
        }).then(async (lastMessage): Promise<void> => {
            trackedMessages[0] = lastMessage.message_id;
            await this.setTrackedMessages(chatId, trackedMessages);
        });
    }

    private async handleTime(chatId: number, message: TelegramBot.Message): Promise<void> {
        let trackedMessages = await this.getTrackedMessages(chatId);
        const editFlag = await this.hasEditParametersFlag(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(editFlag ? prompts.editParameters.time : prompts.addParameters.time, {
                chat_id: chatId,
                message_id: trackedMessages[0],
                parse_mode: "HTML"
            });
        }

        const text = message?.text?.trim() || "";

        if (!isValidTime(text)) {
            this.bot.deleteMessage(chatId, message.message_id);
            if (typeof trackedMessages[1] === "undefined") {
                this.bot.sendMessage(chatId, prompts.addParameters.correctTime, {
                    reply_markup: {
                        inline_keyboard: [
                            ...(editFlag ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                            ...inlineKeyboardCancel.reply_markup.inline_keyboard
                        ]
                    },
                    parse_mode: "HTML",
                    disable_notification: true
                }).then(async (lastMessage): Promise<void> => {
                    trackedMessages[1] = lastMessage.message_id;
                    await this.setTrackedMessages(chatId, trackedMessages);
                });
            }
            return;
        }

        const [wakeStr, sleepStr] = text.split("-").map(time => time.trim());

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        let intermediateUserData = await this.getIntermediateUserData(chatId);

        await this.setIntermediateUserData({
            telegramChatId: intermediateUserData.telegramChatId,
            weight: intermediateUserData.weight,
            city: intermediateUserData.city,
            time: [wakeStr, sleepStr],
            goal: intermediateUserData.goal,
            mute: intermediateUserData.mute
        });

        intermediateUserData = await this.getIntermediateUserData(chatId);
        editFlag ? await this.updateUserData(intermediateUserData) : await this.addUserData(intermediateUserData);

        const userData = await this.getUserData(chatId);

        if (typeof userData !== "undefined") {
            if (editFlag) {
                this.bot.sendMessage(chatId, prompts.editParameters.confirm(userData), {
                    parse_mode: "HTML",
                });
            } else {
                this.bot.sendMessage(chatId, prompts.addParameters.end(userData), {
                    parse_mode: "HTML"
                });
            }
        } else {
            this.bot.sendMessage(chatId, prompts.error(editFlag ? "/edit_parameters" : "/add_parameters"), {
                parse_mode: "HTML"
            });
        }

        await this.deleteWaitingState(chatId);
        await this.deleteTrackedMessages(chatId);
        await this.clearEditParametersFlag(chatId);
        await this.deleteIntermediateUserData(chatId);
    }

    private async handleDelete(chatId: number, message: TelegramBot.Message): Promise<void> {
        const trackedMessages = await this.getTrackedMessages(chatId);
        const text = message.text || "";

        if (text.toLowerCase() !== "да") {
            if (typeof trackedMessages[0] !== "undefined") {
                this.bot.deleteMessage(chatId, message.message_id);
                return;
            }
        }

        await this.deleteUserData(chatId);

        if (typeof trackedMessages[0] !== "undefined") {
            this.bot.editMessageText(prompts.deleteParameters.confirm, {
                chat_id: chatId,
                message_id: trackedMessages[0],
                parse_mode: "HTML"
            });
        }

        this.bot.sendMessage(chatId, prompts.deleteParameters.deleted, {
            parse_mode: "HTML"
        });

        await this.deleteTrackedMessages(chatId);
        await this.deleteWaitingState(chatId);
    }
}