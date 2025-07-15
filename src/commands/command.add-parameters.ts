import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { CallbackData } from "../models/callback-data.enum";
import { WaitingStates } from "../models/waiting-states.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { prompts } from "../utils/prompts";
import { isValidWeight, isValidCity, isValidTime, isNotification } from "../utils/validators";

export class AddParametersCommand extends Command {
    private userProvidedData: UserProvidedData = {
        weight: 0,
        city: "",
        time: ["", ""],
        goal: 0
    }

    private markupCancel: TelegramBot.SendMessageOptions = {
        reply_markup: {
            inline_keyboard: [[{ text: prompts.markupCancel, callback_data: CallbackData.CANCEL_ADD }]]
        }
    }

    constructor(bot: TelegramBot, waitingStates = new Map<number, WaitingStates>, lastMessages: Map<number, MessagesIdsTuple>) {
        super(bot, waitingStates, lastMessages);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotification(chatId, this.waitingStates)) return;

            this.waitingStates.set(chatId, WaitingStates.WEIGHT);

            const trackedMessages = this.getLastMessages(chatId);

            this.bot.sendMessage(chatId, prompts.addParameters.weight, {
                ...this.markupCancel,
                parse_mode: "HTML"
            }).then(lastMessage => {
                trackedMessages[0] = lastMessage.message_id;
                this.setLastMessages(chatId, trackedMessages);
            });
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            if (isNotification(chatId, this.waitingStates)) return;

            if (message.text?.startsWith("/")) {
                const currentTuple = this.lastMessages.get(chatId);

                if (typeof currentTuple?.[0] !== "undefined") {
                    this.bot.editMessageText(prompts.cancel, {
                        chat_id: chatId,
                        message_id: currentTuple?.[0],
                        parse_mode: "HTML"
                    }).catch(() => { });
                }
                if (typeof currentTuple?.[1] !== "undefined") {
                    this.bot.deleteMessage(chatId, currentTuple?.[1])
                }

                this.waitingStates.delete(chatId);
                this.lastMessages.delete(chatId);
                return;
            };

            switch (this.waitingStates.get(chatId)) {
                case WaitingStates.WEIGHT:
                    return this.handleWeight(chatId, message);
                case WaitingStates.CITY:
                    return this.handleCity(chatId, message);
                case WaitingStates.TIME:
                    return this.handleTime(chatId, message);
            }
        });

        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const data = query?.data;

            if (data === CallbackData.CANCEL_ADD && typeof chatId !== "undefined") {
                const trackedMessages = this.getLastMessages(chatId);

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
                this.lastMessages.delete(chatId);
            }
        });
    }

    private handleWeight(chatId: number, message: TelegramBot.Message): void {
        let trackedMessages = this.getLastMessages(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(prompts.addParameters.weight, {
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
                    ...this.markupCancel,
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

        this.waitingStates.delete(chatId);
        this.waitingStates.set(chatId, WaitingStates.CITY);

        this.clearLastMessages(chatId);
        trackedMessages = this.getLastMessages(chatId);

        this.userProvidedData.goal = parseFloat((weight * 0.035).toFixed(2));
        this.userProvidedData.weight = weight;

        this.bot.sendMessage(chatId, prompts.addParameters.city, {
            ...this.markupCancel,
            parse_mode: "HTML"
        }).then(lastMessage => {
            trackedMessages[0] = lastMessage.message_id;
            this.setLastMessages(chatId, trackedMessages);
        });;
    }

    private handleCity(chatId: number, message: TelegramBot.Message): void {
        let trackedMessages = this.getLastMessages(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(prompts.addParameters.city, {
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
                    ...this.markupCancel,
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

        this.waitingStates.delete(chatId);
        this.waitingStates.set(chatId, WaitingStates.TIME);

        this.clearLastMessages(chatId);
        trackedMessages = this.getLastMessages(chatId);

        this.userProvidedData.city = text;

        this.bot.sendMessage(chatId, prompts.addParameters.time, {
            ...this.markupCancel,
            parse_mode: "HTML"
        }).then(lastMessage => {
            trackedMessages[0] = lastMessage.message_id;
            this.setLastMessages(chatId, trackedMessages);
        });
    }

    private handleTime(chatId: number, message: TelegramBot.Message): void {
        let trackedMessages = this.getLastMessages(chatId);

        if (typeof trackedMessages[0] !== "undefined" && typeof trackedMessages[1] === "undefined") {
            this.bot.editMessageText(prompts.addParameters.time, {
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
                    ...this.markupCancel,
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

        this.waitingStates.delete(chatId);

        this.clearLastMessages(chatId);

        this.userProvidedData.time = [wakeStr, sleepStr];

        this.bot.sendMessage(chatId, prompts.addParameters.end(this.userProvidedData));
    }

    // private sendWithTracking(chatId: number, text: string, index?: 0 | 1, options?: TelegramBot.SendMessageOptions): void {
    //     this.bot.sendMessage(chatId, text, { parse_mode: "HTML", ...options })
    //         .then(sentMessage => {
    //             if (typeof index === "number") {
    //                 this.lastMessages[index] = sentMessage.message_id;
    //             }
    //         });
    // }

    // private editTrackedMessage(chatId: number, text: string, index: 0 | 1, options?: TelegramBot.EditMessageTextOptions): void {
    //     this.bot.editMessageText(text, {
    //         chat_id: chatId,
    //         message_id: this.lastMessages[index],
    //         parse_mode: "HTML", ...options
    //     });
    // }

    // private deleteTrackedMessage(chatId: number, index: 0 | 1): void {
    //     if (typeof this.lastMessages[index] === "number") {
    //         this.bot.deleteMessage(chatId, this.lastMessages[index]);
    //         this.lastMessages[index] = undefined;
    //     }
    // }

    private async saveParameters(data: UserProvidedData): Promise<void> {

    }
}

