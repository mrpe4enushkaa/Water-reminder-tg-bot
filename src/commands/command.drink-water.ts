import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { keyboardVolumeOptions, inlineKeyboardSnooze } from "../utils/reply-markups";
import { WaitingStates } from "../models/waiting-states.type";
import { CallbackData } from "../models/callback-data.enum";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isValidVolume } from "../utils/validators";

export class DrinkWaterCommand extends Command {
    private messageVolume = (chatId: number, volume: number): Promise<TelegramBot.Message> =>
        this.bot.sendMessage(chatId, prompts.drinkWater.add(volume));

    private messageSnooze = (chatId: number): Promise<number | void> => this.bot.sendMessage(chatId, prompts.drinkWater.snooze, { ...inlineKeyboardSnooze })
        .then(lastMessage => {
            const trackedMessages = this.getLastMessages(chatId);
            trackedMessages[1] = lastMessage.message_id;
            this.setLastMessages(chatId, trackedMessages);
        });

    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>,
        editUserParameters: Set<number>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue, editUserParameters);
    }

    public handle(): void {
        this.bot.onText(/^\/drink$/, (message): void => {
            const chatId = message.chat.id;
            if (this.waitingStates.get(chatId) === WaitingStates.DRINK || this.waitingStates.get(chatId) === WaitingStates.CHOICE) {
                return;
            }

            const trackedMessages = this.getLastMessages(chatId);

            this.notificationQueue.add(chatId);
            this.waitingStates.set(chatId, WaitingStates.DRINK);

            this.startMessage(chatId, trackedMessages, prompts.drinkWater.timeTo, {
                ...keyboardVolumeOptions
            });
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;
            const text = message.text || "";

            if (this.waitingStates.get(chatId) === WaitingStates.DRINK || this.waitingStates.get(chatId) === WaitingStates.CHOICE) {
                if (text === prompts.drinkWater.keyboardChoice) {
                    const trackedMessages = this.getLastMessages(chatId);

                    this.waitingStates.set(chatId, WaitingStates.CHOICE);

                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[1]);
                        this.clearLastMessages(chatId);
                    }

                    this.bot.sendMessage(chatId, prompts.drinkWater.choice, {
                        reply_markup: {
                            remove_keyboard: true
                        }
                    }).then(lastMessage => {
                        trackedMessages[0] = lastMessage.message_id;
                        this.messageSnooze(chatId);
                    });
                }

                switch (this.waitingStates.get(chatId)) {
                    case WaitingStates.DRINK:
                        return this.keyboardChoiseWater(chatId, message);
                    case WaitingStates.CHOICE:
                        return this.userChoiseWater(chatId, message);
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
            this.messageSnooze(chatId);
        });
    }

    private keyboardChoiseWater(chatId: number, message: TelegramBot.Message): void {
        const text = message?.text || "";
        const trackedMessages = this.getLastMessages(chatId);

        if (!isValidVolume(text)) {
            this.bot.deleteMessage(chatId, message.message_id);

            if (typeof trackedMessages[1] !== "undefined") {
                this.bot.editMessageText(`${prompts.drinkWater.error}
                \n${prompts.drinkWater.snooze}`, {
                    chat_id: chatId,
                    message_id: trackedMessages[1],
                    reply_markup: inlineKeyboardSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup
                }).catch(() => { });
            }

            return;
        }

        const volume = parseFloat(text);

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        this.messageVolume(chatId, volume);

        this.waitingStates.delete(chatId);
        this.notificationQueue.delete(chatId);

        this.clearLastMessages(chatId);
    }

    private userChoiseWater(chatId: number, message: TelegramBot.Message): void {
        const text = message.text || "";
        const trackedMessages = this.getLastMessages(chatId);

        if (!isValidVolume(text)) {
            if (typeof trackedMessages[1] !== "undefined") {
                this.bot.deleteMessage(chatId, message.message_id);
                this.bot.editMessageText(`${prompts.drinkWater.error}
                \n${prompts.drinkWater.snooze}`, {
                    chat_id: chatId,
                    message_id: trackedMessages[1],
                    reply_markup: inlineKeyboardSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup
                }).catch(() => { });
            }
            return;
        }

        const volume = parseFloat(text);

        this.messageVolume(chatId, volume);

        if (typeof trackedMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, trackedMessages[1]);
        }

        this.waitingStates.delete(chatId);
        this.notificationQueue.delete(chatId);

        this.clearLastMessages(chatId);
    }

    private async updateWaterGoal(): Promise<void> {

    }
}