import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { CallbackData } from "../models/callback-data.enum";
import { WaitingStates } from "../models/waiting-states.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { isValidWeight, isValidCity, isValidTime, isNotificationQueue } from "../utils/validators";
import { prompts } from "../utils/prompts";
import { inlineKeyboardCancel } from "../utils/reply-markups";

export class AddParametersCommand extends Command {
    private userProvidedData: Map<number, UserProvidedData> = new Map<number, UserProvidedData>;

    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            this.userProvidedData.set(chatId, {
                weight: undefined,
                city: undefined,
                time: [undefined, undefined],
                goal: undefined
            });

            this.waitingStates.set(chatId, WaitingStates.WEIGHT);

            const trackedMessages = this.getLastMessages(chatId);

            this.bot.sendMessage(chatId, prompts.addParameters.weight, {
                ...inlineKeyboardCancel,
                parse_mode: "HTML"
            }).then(lastMessage => {
                trackedMessages[0] = lastMessage.message_id;
                this.setLastMessages(chatId, trackedMessages);
            });
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
                    ...inlineKeyboardCancel,
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

        this.bot.sendMessage(chatId, prompts.addParameters.city, {
            ...inlineKeyboardCancel,
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
                    ...inlineKeyboardCancel,
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

        this.bot.sendMessage(chatId, prompts.addParameters.time, {
            ...inlineKeyboardCancel,
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
                    ...inlineKeyboardCancel,
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

        const userProvidedData = this.userProvidedData.get(chatId);

        this.userProvidedData.set(chatId, {
            weight: userProvidedData?.weight,
            city: userProvidedData?.city,
            time: [wakeStr, sleepStr],
            goal: userProvidedData?.goal
        });

        const userData = this.userProvidedData.get(chatId);

        if (typeof userData !== "undefined") {
            this.bot.sendMessage(chatId, prompts.addParameters.end(userData));
        } else {
            this.bot.sendMessage(chatId, prompts.error("/add_parameters"), {
                parse_mode: "HTML"
            });
        }
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

