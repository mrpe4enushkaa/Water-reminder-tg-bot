import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { drinkVolumeOptions } from "../utils/drink-volume-options";
import { WaitingStates } from "../models/waiting-states.type";
import { CallbackData } from "../models/callback-data.enum";
import { MessagesIdsTuple } from "../models/messages-ids.type";

export class NotificationCommand extends Command {
    // private waitingStates = new Map<number, WaitingStates>;
    // private lastMessages: MessagesIdsTuple = [undefined, undefined];

    constructor(bot: TelegramBot, waitingStates = new Map<number, WaitingStates>, lastMessages: MessagesIdsTuple) {
        super(bot, waitingStates, lastMessages);
    }

    handle(): void {
        this.bot.onText(/^\/notification$/, (message): void => {
            const chatId = message.chat.id;

            this.bot.sendMessage(chatId, prompts.notification.timeTo, {
                parse_mode: "HTML",
                ...drinkVolumeOptions(prompts.notification)
            }).then(lastMessage => this.lastMessages[0] = lastMessage.message_id);
            this.waitingStates.set(chatId, WaitingStates.DRANK);
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            switch (this.waitingStates.get(chatId)) {
                case WaitingStates.DRANK:
                    this.bot.deleteMessage(chatId, message.message_id);
                    break;
                case WaitingStates.CHOICE:
                    const volume = parseFloat(message.text || "");
                    this.bot.sendMessage(chatId, `Отлично. Записал, что ты выпил ${volume} мл`);
                    break;
            }
        });

        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const data = query?.data;

            if (
                typeof chatId !== "undefined" &&
                typeof data === "string" &&
                this.waitingStates.has(chatId)
            ) {
                if ([CallbackData.DRANK_200, CallbackData.DRANK_250, CallbackData.DRANK_300, CallbackData.DRANK_350].includes(data as CallbackData)) {
                    const volume = data.split("_")[1];

                    this.bot.sendMessage(chatId, `Выпито ${volume} мл`);
                    this.waitingStates.delete(chatId);

                    if (typeof this.lastMessages[0] !== "undefined") {
                        this.bot.deleteMessage(chatId, this.lastMessages[0]);
                    }
                    return;
                }

                if (data === CallbackData.CHOICE) {
                    if (typeof this.lastMessages[0] !== "undefined") {
                        this.bot.editMessageText(prompts.notification.timeTo, {
                            chat_id: chatId,
                            message_id: query.message?.message_id
                        });
                    }
                    this.waitingStates.delete(chatId);
                    this.waitingStates.set(chatId, WaitingStates.CHOICE);

                    this.bot.sendMessage(chatId, "Напишите количество выпитой воды");
                }

                if (data === CallbackData.SNOOZE) {
                    if (typeof this.lastMessages[0] !== "undefined") {
                        this.bot.editMessageText("Напомню выпить воду через 7 минут", {
                            chat_id: chatId,
                            message_id: query.message?.message_id
                        });
                    }
                }
            }
        });
    }
}