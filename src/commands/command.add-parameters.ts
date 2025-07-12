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

    constructor(bot: TelegramBot, waitingStates = new Map<number, WaitingStates>, lastMessages: MessagesIdsTuple) {
        super(bot, waitingStates, lastMessages);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotification(chatId, this.waitingStates)) return;

            this.waitingStates.set(chatId, WaitingStates.WEIGHT);
            this.sendWithTracking(
                chatId,
                prompts.addParameters.weight,
                0,
                { ...this.markupCancel },
            );
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;
            
            if (isNotification(chatId, this.waitingStates)) return;

            if (message.text?.startsWith("/")) {
                this.waitingStates.delete(chatId);
                if (typeof this.lastMessages[0] !== "undefined") {
                    this.bot.editMessageText(prompts.cancel, {
                        chat_id: chatId,
                        message_id: this.lastMessages[0]
                    }).catch(() => { });
                }
                if (typeof this.lastMessages[1] !== "undefined") {
                    this.deleteTrackedMessage(chatId, 1);
                }
                this.lastMessages = [undefined, undefined];
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
                this.waitingStates.delete(chatId);
                if (typeof this.lastMessages[0] === "number") {
                    this.editTrackedMessage(chatId, prompts.cancel, 0);
                }
                if (typeof this.lastMessages[1] === "number") {
                    this.deleteTrackedMessage(chatId, 1);
                }
                this.lastMessages = [undefined, undefined];
            }
        });
    }

    private handleWeight(chatId: number, message: TelegramBot.Message): void {
        if (typeof this.lastMessages[1] === "undefined") {
            this.editTrackedMessage(
                chatId,
                prompts.addParameters.weight,
                0
            );
        }

        const text = message?.text?.trim() || "";
        const weight = parseFloat(text);

        if (!isValidWeight(text)) {
            this.bot.deleteMessage(chatId, message.message_id);
            if (typeof this.lastMessages[1] === "undefined") {
                this.sendWithTracking(
                    chatId,
                    prompts.addParameters.correctWeight,
                    1,
                    this.markupCancel,
                );
            }
            return;
        }

        this.deleteTrackedMessage(chatId, 1);

        this.waitingStates.delete(chatId);
        this.waitingStates.set(chatId, WaitingStates.CITY);

        this.lastMessages = [undefined, undefined];

        this.userProvidedData.goal = parseFloat((weight * 0.035).toFixed(2));
        this.userProvidedData.weight = weight;

        this.sendWithTracking(
            chatId,
            prompts.addParameters.city,
            0,
            { ...this.markupCancel }
        );
    }

    private handleCity(chatId: number, message: TelegramBot.Message): void {
        if (typeof this.lastMessages[1] === "undefined") {
            this.editTrackedMessage(
                chatId,
                prompts.addParameters.city,
                0
            );
        }

        const text = message?.text || "";

        if (!isValidCity(text)) {
            this.bot.deleteMessage(chatId, message.message_id);
            if (typeof this.lastMessages[1] === "undefined") {
                this.sendWithTracking(
                    chatId,
                    prompts.addParameters.correctCity,
                    1,
                    this.markupCancel,
                );
            }
            return;
        }

        this.deleteTrackedMessage(chatId, 1);

        this.waitingStates.delete(chatId);
        this.waitingStates.set(chatId, WaitingStates.TIME);

        this.lastMessages = [undefined, undefined];

        this.userProvidedData.city = text;

        this.sendWithTracking(
            chatId,
            prompts.addParameters.time,
            0,
            { ...this.markupCancel }
        );
    }

    private handleTime(chatId: number, message: TelegramBot.Message): void {
        if (typeof this.lastMessages[1] === "undefined") {
            this.editTrackedMessage(
                chatId,
                prompts.addParameters.time,
                0
            );
        }

        const text = message?.text?.trim() || "";

        if (!isValidTime(text)) {
            this.bot.deleteMessage(chatId, message.message_id);
            if (typeof this.lastMessages[1] === "undefined") {
                this.sendWithTracking(
                    chatId,
                    prompts.addParameters.correctTime,
                    1,
                    this.markupCancel,
                );
            }
            return;
        }

        const [wakeStr, sleepStr] = text.split("-").map(time => time.trim());

        this.deleteTrackedMessage(chatId, 1);

        this.waitingStates.delete(chatId);

        this.lastMessages = [undefined, undefined];

        this.userProvidedData.time = [wakeStr, sleepStr];

        this.bot.sendMessage(chatId, prompts.addParameters.end(this.userProvidedData));
    }

    private sendWithTracking(chatId: number, text: string, index?: 0 | 1, options?: TelegramBot.SendMessageOptions): void {
        this.bot.sendMessage(chatId, text, { parse_mode: "HTML", ...options })
            .then(sentMessage => {
                if (typeof index === "number") {
                    this.lastMessages[index] = sentMessage.message_id;
                }
            });
    }

    private editTrackedMessage(chatId: number, text: string, index: 0 | 1, options?: TelegramBot.EditMessageTextOptions): void {
        this.bot.editMessageText(text, {
            chat_id: chatId,
            message_id: this.lastMessages[index],
            parse_mode: "HTML", ...options
        });
    }

    private deleteTrackedMessage(chatId: number, index: 0 | 1): void {
        if (typeof this.lastMessages[index] === "number") {
            this.bot.deleteMessage(chatId, this.lastMessages[index]);
            this.lastMessages[index] = undefined;
        }
    }

    private async saveParameters(data: UserProvidedData): Promise<void> {

    }
}

