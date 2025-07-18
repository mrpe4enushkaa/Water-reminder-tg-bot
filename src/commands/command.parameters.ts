import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { WaitingStates } from "../models/waiting-states.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { isValidWeight, isValidCity, isValidTime, isNotificationQueue } from "../utils/validators";
import { prompts } from "../utils/prompts";
import { inlineKeyboardCancel, inlineKeyboardContinue } from "../utils/reply-markups";
import { CallbackData } from "../models/callback-data.enum";

export class ParametersCommand extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>,
        editUserParameters: Set<number>,
        userProvidedData: Map<number, UserProvidedData>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue, editUserParameters, userProvidedData);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            //if (get userProvidedData from mongo or redis) return;
            this.startMessage(chatId);
        });

        this.bot.onText(/^\/edit_parameters$/, (message): void => {
            const chatId = message.chat.id;
            //if (!get userProvidedData from mongo or redis) return;
            this.editUserParameters.add(chatId);

            this.startMessage(chatId);
        });

        this.bot.onText(/^\/delete_parameters$/, (message): void => {
            const chatId = message.chat.id;
            //if (!get userProvidedData from mongo or redis) return;
            this.waitingStates.set(chatId, WaitingStates.DELETE);

            this.bot.sendMessage(chatId, prompts.deleteParameters.confirm, {
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true,
                    ...inlineKeyboardCancel.reply_markup
                }
            }).then(lastMessage => this.setLastMessages(chatId, [lastMessage.message_id, undefined]));
        });

        this.bot.onText(/^\/info_parameters$/, (message): void => {
            const chatId = message.chat.id;
            //if (!get userProvidedData from mongo or redis) return;

            const userParameters = this.userProvidedData.get(chatId);

            if (typeof userParameters !== "undefined") {
                this.bot.sendMessage(chatId, prompts.info_parameters(userParameters), {
                    parse_mode: "HTML",
                    reply_markup: {
                        remove_keyboard: true
                    }
                });
            }
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            switch (this.waitingStates.get(chatId)) {
                case WaitingStates.WEIGHT:
                    return this.handleWeight(chatId, message);
                case WaitingStates.CITY:
                    return this.handleCity(chatId, message);
                case WaitingStates.TIME:
                    return this.handleTime(chatId, message);
                case WaitingStates.DELETE:
                    return this.handleDelete(chatId, message);
            }
        });
    }

    private startMessage(chatId: number): void {
        if (isNotificationQueue(chatId, this.notificationQueue)) return;

        this.waitingStates.set(chatId, WaitingStates.WEIGHT);

        this.userProvidedData.set(chatId, {
            weight: undefined,
            city: undefined,
            time: [undefined, undefined],
            goal: undefined
        });

        const trackedMessages = this.getLastMessages(chatId);

        this.bot.sendMessage(chatId, this.editUserParameters.has(chatId) ? prompts.editParameters.weight : prompts.addParameters.weight, {
            reply_markup: {
                inline_keyboard: [
                    ...(this.editUserParameters.has(chatId) ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                    ...inlineKeyboardCancel.reply_markup.inline_keyboard
                ],
                remove_keyboard: true
            },
            parse_mode: "HTML"
        }).then(lastMessage => {
            trackedMessages[0] = lastMessage.message_id;
            this.setLastMessages(chatId, trackedMessages);
        });
    }

    private handleWeight(chatId: number, message: TelegramBot.Message): void {
        let trackedMessages = this.getLastMessages(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(this.editUserParameters.has(chatId) ? prompts.editParameters.weight : prompts.addParameters.weight, {
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
                            ...(this.editUserParameters.has(chatId) ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                            ...inlineKeyboardCancel.reply_markup.inline_keyboard
                        ]
                    },
                    parse_mode: "HTML"
                }).then(lastMessage => {
                    trackedMessages[1] = lastMessage.message_id;
                    this.setLastMessages(chatId, trackedMessages);
                });
            }
            return;
        }

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        this.waitingStates.set(chatId, WaitingStates.CITY);

        this.clearLastMessages(chatId);
        trackedMessages = this.getLastMessages(chatId);

        const userProvidedData = this.userProvidedData.get(chatId);

        this.userProvidedData.set(chatId, {
            weight: weight,
            city: userProvidedData?.city,
            time: userProvidedData?.time ?? [undefined, undefined],
            goal: parseFloat((weight * 0.035).toFixed(2)),
        });

        this.bot.sendMessage(chatId, this.editUserParameters.has(chatId) ? prompts.editParameters.city : prompts.addParameters.city, {
            reply_markup: {
                inline_keyboard: [
                    ...(this.editUserParameters.has(chatId) ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                    ...inlineKeyboardCancel.reply_markup.inline_keyboard
                ]
            },
            parse_mode: "HTML"
        }).then(lastMessage => {
            trackedMessages[0] = lastMessage.message_id;
            this.setLastMessages(chatId, trackedMessages);
        });;
    }

    private handleCity(chatId: number, message: TelegramBot.Message): void {
        let trackedMessages = this.getLastMessages(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(this.editUserParameters.has(chatId) ? prompts.editParameters.city : prompts.addParameters.city, {
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
                            ...(this.editUserParameters.has(chatId) ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                            ...inlineKeyboardCancel.reply_markup.inline_keyboard
                        ]
                    },
                    parse_mode: "HTML"
                }).then(lastMessage => {
                    trackedMessages[1] = lastMessage.message_id;
                    this.setLastMessages(chatId, trackedMessages);
                });
            }
            return;
        }

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        this.waitingStates.set(chatId, WaitingStates.TIME);

        this.clearLastMessages(chatId);
        trackedMessages = this.getLastMessages(chatId);

        const userProvidedData = this.userProvidedData.get(chatId);

        this.userProvidedData.set(chatId, {
            weight: userProvidedData?.weight,
            city: text,
            time: userProvidedData?.time ?? [undefined, undefined],
            goal: userProvidedData?.goal
        });

        this.bot.sendMessage(chatId, this.editUserParameters.has(chatId) ? prompts.editParameters.time : prompts.addParameters.time, {
            reply_markup: {
                inline_keyboard: [
                    ...(this.editUserParameters.has(chatId) ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                    ...inlineKeyboardCancel.reply_markup.inline_keyboard
                ]
            },
            parse_mode: "HTML"
        }).then(lastMessage => {
            trackedMessages[0] = lastMessage.message_id;
            this.setLastMessages(chatId, trackedMessages);
        });
    }

    private handleTime(chatId: number, message: TelegramBot.Message): void {
        let trackedMessages = this.getLastMessages(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(this.editUserParameters.has(chatId) ? prompts.editParameters.time : prompts.addParameters.time, {
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
                            ...(this.editUserParameters.has(chatId) ? inlineKeyboardContinue.reply_markup.inline_keyboard : []),
                            ...inlineKeyboardCancel.reply_markup.inline_keyboard
                        ]
                    },
                    parse_mode: "HTML"
                }).then(lastMessage => {
                    trackedMessages[1] = lastMessage.message_id;
                    this.setLastMessages(chatId, trackedMessages);
                });
            }
            return;
        }

        const [wakeStr, sleepStr] = text.split("-").map(time => time.trim());

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        const userProvidedData = this.userProvidedData.get(chatId);

        this.userProvidedData.set(chatId, {
            weight: userProvidedData?.weight,
            city: userProvidedData?.city,
            time: [wakeStr, sleepStr],
            goal: userProvidedData?.goal
        });

        const userData = this.userProvidedData.get(chatId);

        if (typeof userData !== "undefined") {
            if (this.editUserParameters.has(chatId)) {
                this.bot.sendMessage(chatId, prompts.editParameters.confirm(userData), {
                    parse_mode: "HTML",
                });
                return;
            }

            this.bot.sendMessage(chatId, prompts.addParameters.end(userData), {
                parse_mode: "HTML"
            });
        } else {
            this.bot.sendMessage(chatId, prompts.error(this.editUserParameters.has(chatId) ? "/edit_parameters" : "/add_parameters"), {
                parse_mode: "HTML"
            });
        }

        this.waitingStates.delete(chatId);
        this.clearLastMessages(chatId);
        this.editUserParameters.delete(chatId);

        //this.editUserParameters.has(chatId) ? updateUserParameters : saveUserParameters
    }

    private handleDelete(chatId: number, message: TelegramBot.Message): void {
        const trackedMessages = this.getLastMessages(chatId);
        const text = message.text || "";

        if (text.toLowerCase() !== "да") {
            if (typeof trackedMessages[0] !== "undefined") {
                this.bot.deleteMessage(chatId, message.message_id);
                return;
            }
        }

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
        this.clearLastMessages(chatId);
        this.waitingStates.delete(chatId);
    }

    private async saveUserParameters(data: UserProvidedData): Promise<void> {

    }

    private async updateUserParameters(data: UserProvidedData): Promise<void> {

    }
}

