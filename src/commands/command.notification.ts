import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { drinkVolumeOptions } from "../utils/drink-volume-options";
import { WaitingStates } from "../models/waiting-states.type";
import { CallbackData } from "../models/callback-data.enum";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isValidVolume } from "../utils/validators";

export class NotificationCommand extends Command {
    private markupSnooze: TelegramBot.SendMessageOptions = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Перенести на 7 мин', callback_data: CallbackData.SNOOZE }]
            ]
        }
    }

    constructor(bot: TelegramBot, waitingStates = new Map<number, WaitingStates>, lastMessages: MessagesIdsTuple) {
        super(bot, waitingStates, lastMessages);
    }

    handle(): void {
        this.bot.onText(/^\/notification$/, (message): void => {
            const chatId = message.chat.id;

            this.bot.sendMessage(chatId, prompts.notification.timeTo, {
                parse_mode: "HTML",
                // ...drinkVolumeOptions(prompts.notification)
                reply_markup: {
                    keyboard: [
                        [{ text: '200 мл' }, { text: '250 мл' }, { text: '300 мл' }],
                        [{ text: '350 мл' }, { text: '400 мл' }],
                        [{ text: 'Свой объём' }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                    input_field_placeholder: "Выберите объём воды",
                }
            }).then(lastMessage => {
                this.lastMessages[0] = lastMessage.message_id;
                this.bot.sendMessage(chatId, "Или отложить напоминание:", { ...this.markupSnooze })
                    .then(lastMessage => this.lastMessages[1] = lastMessage.message_id);
            });
            this.waitingStates.set(chatId, WaitingStates.DRANK);
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            // if (message.text?.startsWith("/")) {
            //     this.waitingStates.delete(chatId);
            //     if (typeof this.lastMessages[0] !== "undefined") {
            //         this.bot.editMessageText(prompts.cancel, {
            //             chat_id: chatId,
            //             message_id: this.lastMessages[0]
            //         }).catch(() => { });
            //     }
            //     this.lastMessages = [undefined, undefined];
            //     return;
            // }; //придумать надо кое-что с напоминанием, т.к. нельзя по задумке его удалить

            if (message.text === "Свой объём") {
                this.waitingStates.delete(chatId);
                this.waitingStates.set(chatId, WaitingStates.CHOICE);

                if (typeof this.lastMessages[1] !== "undefined") {
                    this.bot.deleteMessage(chatId, this.lastMessages[1]);
                    this.lastMessages = [undefined, undefined];
                }

                this.bot.sendMessage(chatId, "Напишите количество выпитой воды", {
                    ...this.markupSnooze
                }).then(lastMessage => {
                    this.lastMessages[0] = lastMessage.message_id;
                });
            }

            switch (this.waitingStates.get(chatId)) {
                case WaitingStates.DRANK:
                    return this.keyboardChoise(chatId, message);
                case WaitingStates.CHOICE:
                    return this.userChoise(chatId, message);
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
                    if (typeof this.lastMessages[1] !== "undefined") {
                        this.bot.editMessageText("Напомню выпить воду через 7 минут", {
                            chat_id: chatId,
                            message_id: this.lastMessages[1]
                        });
                    }
                    if (typeof this.lastMessages[0] !== "undefined") {
                        this.bot.deleteMessage(chatId, this.lastMessages[0]);
                    }
                    this.lastMessages = [undefined, undefined]; // fiil(undefined);
                    this.waitingStates.delete(chatId);
                }
            }
        });
    }

                    //     this.lastMessages.forEach((lastMessage) => {
                    //     if (typeof lastMessage !== "undefined") this.bot.deleteMessage(chatId, lastMessage);
                    // });
                    // this.bot.sendMessage(chatId, "Напомню выпить воду через 7 минут");

    private keyboardChoise(chatId: number, message: TelegramBot.Message): void {
        const text = message?.text || "";

        if (!isValidVolume(text)) {
            this.bot.deleteMessage(chatId, message.message_id);

            this.bot.editMessageText(`Пожалуйста, введите коректное значение объема воды (в мл),
                \nили отложить напоминание`, {
                chat_id: chatId,
                message_id: this.lastMessages[1],
                reply_markup: this.markupSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup
            }).catch(() => { });

            return;
        }

        const volume = parseFloat(text);

        this.bot.sendMessage(chatId, `Отлично. Записал, что ты выпил(a) ${volume} мл`);

        if (typeof this.lastMessages[1] !== "undefined") {
            this.bot.deleteMessage(chatId, this.lastMessages[1]);
        }

        this.lastMessages = [undefined, undefined];
    }

    private userChoise(chatId: number, message: TelegramBot.Message): void {
        const text = message.text || "";

        if (text === "Свой объём") {
            return;
        };

        this.bot.editMessageText("Напишите количество выпитой воды", {
            chat_id: chatId,
            message_id: this.lastMessages[0]
        }).catch(() => { });

        if (!isValidVolume(text)) {
            this.bot.deleteMessage(chatId, message.message_id);

            if (typeof this.lastMessages[1] === "undefined") {
                this.bot.sendMessage(chatId, `Пожалуйста, введите коректное значение объема воды (в мл),
                \nили отложить напоминание`, {
                    reply_markup: this.markupSnooze.reply_markup as TelegramBot.InlineKeyboardMarkup
                }).then(lastMessage => this.lastMessages[1] = lastMessage.message_id);
            }

            return;
        }

        const volume = parseFloat(text);

        this.bot.sendMessage(chatId, `Отлично. Записал, что ты выпил(a) ${volume} мл`);
    }
}