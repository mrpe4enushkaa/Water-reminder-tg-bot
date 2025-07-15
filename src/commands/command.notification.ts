import TelegramBot, { Message } from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { drinkVolumeOptions } from "../utils/drink-volume-options";
import { WaitingStates } from "../models/waiting-states.type";
import { CallbackData } from "../models/callback-data.enum";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isNotification, isValidVolume } from "../utils/validators";

export class NotificationCommand extends Command {
    private markupSnooze: TelegramBot.SendMessageOptions = {
        reply_markup: {
            inline_keyboard: [
                [{ text: prompts.notification.markupSnooze, callback_data: CallbackData.SNOOZE }]
            ]
        }
    }

    private messageSnooze = (chatId: number): Promise<number | void> => this.bot.sendMessage(chatId, prompts.notification.snooze, { ...this.markupSnooze })
        .then(lastMessage => {
            const currentTuple = this.getLastMessages(chatId);
            currentTuple[1] = lastMessage.message_id;
        });

    private messageVolume = (chatId: number, volume: number): Promise<Message> => this.bot.sendMessage(chatId, prompts.notification.add(volume));

    constructor(bot: TelegramBot, waitingStates = new Map<number, WaitingStates>, lastMessages: Map<number, MessagesIdsTuple>) {
        super(bot, waitingStates, lastMessages);
    }

    handle(): void {
        this.bot.onText(/^\/notification$/, (message): void => {
            const chatId = message.chat.id;

            if (this.waitingStates.get(chatId) === WaitingStates.DRANK) {
                this.bot.deleteMessage(chatId, message.message_id);
                return;
            }

            const currentTuple = this.getLastMessages(chatId);

            this.waitingStates.set(chatId, WaitingStates.DRANK);

            this.bot.sendMessage(chatId, prompts.notification.timeTo, {
                parse_mode: "HTML",
                ...drinkVolumeOptions
            }).then(lastMessage => {
                currentTuple[0] = lastMessage.message_id;
                this.bot.sendMessage(chatId, prompts.notification.snooze, { ...this.markupSnooze })
                    .then(lastMessage => {
                        currentTuple[1] = lastMessage.message_id;
                        this.setLastMessages(chatId, currentTuple);
                    });
            });
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;
            const text = message.text || "";

            if (isNotification(chatId, this.waitingStates)) {
                if (text === prompts.notification.keyboardChoice) {
                    const currentTuple = this.getLastMessages(chatId);

                    this.waitingStates.delete(chatId);
                    this.waitingStates.set(chatId, WaitingStates.CHOICE);

                    if (typeof currentTuple?.[1] !== "undefined") {
                        this.bot.deleteMessage(chatId, currentTuple[1]);
                        this.clearLastMessages(chatId);
                    }

                    this.bot.sendMessage(chatId, prompts.notification.choice, {
                        reply_markup: {
                            remove_keyboard: true
                        }
                    })
                        .then(lastMessage => {
                            currentTuple[0] = lastMessage.message_id;
                            this.messageSnooze(chatId);
                            this.setLastMessages(chatId, currentTuple);
                        });
                }

                switch (this.waitingStates.get(chatId)) {
                    case WaitingStates.DRANK:
                        return this.keyboardChoise(chatId, message);
                    case WaitingStates.CHOICE:
                        return this.userChoise(chatId, message);
                }
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
                if (data === CallbackData.SNOOZE) {
                    const currentTuple = this.getLastMessages(chatId);

                    if (typeof currentTuple?.[1] !== "undefined") {
                        this.bot.editMessageText(prompts.notification.clickedSnooze, {
                            chat_id: chatId,
                            message_id: currentTuple?.[1]
                        });
                    }
                    if (typeof currentTuple?.[0] !== "undefined") {
                        this.bot.deleteMessage(chatId, currentTuple?.[0]);
                    }

                    this.clearLastMessages(chatId);

                    this.waitingStates.delete(chatId);
                }
            }
        });
    }

    private keyboardChoise(chatId: number, message: TelegramBot.Message): void {
        const text = message?.text || "";
        const currentTuple = this.getLastMessages(chatId);

        if (!isValidVolume(text)) {
            this.bot.deleteMessage(chatId, message.message_id);

            if (typeof currentTuple?.[1] !== "undefined") {
                this.bot.editMessageText(`${prompts.notification.error}
                \n${prompts.notification.snooze}`, {
                    chat_id: chatId,
                    message_id: currentTuple?.[1],
                    reply_markup: this.markupSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup
                }).catch(() => { });
            }

            return;
        }

        const volume = parseFloat(text);

        if (typeof currentTuple?.[1] !== "undefined") {
            this.bot.deleteMessage(chatId, currentTuple?.[1]);
        }

        this.messageVolume(chatId, volume);

        this.waitingStates.delete(chatId);

        this.clearLastMessages(chatId);
    }

    private userChoise(chatId: number, message: TelegramBot.Message): void {
        const text = message.text || "";
        const currentTuple = this.getLastMessages(chatId);

        if (!isValidVolume(text)) {
            if (typeof currentTuple?.[1] !== "undefined") {
                this.bot.deleteMessage(chatId, message.message_id);
                this.bot.editMessageText(`${prompts.notification.error}
                \n${prompts.notification.snooze}`, {
                    chat_id: chatId,
                    message_id: currentTuple?.[1],
                    reply_markup: this.markupSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup
                }).catch(() => { });
            }
            return;
        }

        const volume = parseFloat(text);

        this.messageVolume(chatId, volume);

        if (typeof currentTuple?.[1] !== "undefined") {
            this.bot.deleteMessage(chatId, currentTuple?.[1]);
        }

        this.waitingStates.delete(chatId);

        this.clearLastMessages(chatId);
    }
}