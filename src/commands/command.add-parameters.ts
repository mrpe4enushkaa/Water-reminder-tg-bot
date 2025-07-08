import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { MessageIdsTuple } from "../types/messageIdsTuple.type";
import { CallbackData } from "../types/callbackData.enum";

export class AddParametersCommand extends Command {
    //-------------------------------------------0----------1----//
    private lastMessages: MessageIdsTuple = [undefined, undefined];

    private markupCancel: TelegramBot.SendMessageOptions = {
        reply_markup: {
            inline_keyboard: [[{ text: "Отменить действие", callback_data: CallbackData.CANCEL_ADD }]]
        }
    }

    constructor(bot: TelegramBot, waitingForWeight: Set<number>) {
        super(bot, waitingForWeight);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            this.waitingForWeight.add(chatId);
            //-----------------------------------------------0-----------------------------------------------//
            this.sendWithTracking(
                chatId,
                `<b>💧 Введите ваш вес, чтобы я мог рассчитать норму воды на день!</b>
                \n<i>Забота о себе начинается с маленьких шагов 😊</i>`,
                0,
                { parse_mode: "HTML", ...this.markupCancel },
            );
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            if (!this.waitingForWeight.has(chatId)) return;

            if (message.text?.startsWith("/")) {
                this.waitingForWeight.delete(chatId);
                return;
            };

            const weight = parseFloat(message.text || "");

            if (isNaN(weight) || weight <= 0) {
                this.bot.deleteMessage(chatId, message.message_id);
                if (typeof this.lastMessages[1] === "undefined") {
                    this.editTrackedMessage(
                        chatId,
                        `<b>💧 Введите ваш вес, чтобы я мог рассчитать норму воды на день!</b>
                        \n<i>Забота о себе начинается с маленьких шагов 😊</i>`,
                        0,
                        { parse_mode: "HTML" }
                    );
                }

                //-------------------------------------1--------------------------------------//
                if (typeof this.lastMessages[1] === "undefined") {
                    this.sendWithTracking(
                        chatId,
                        "Пожалуйста, введите корректное число для веса.",
                        1,
                        this.markupCancel,
                    );
                }
                return;
            }

            this.waitingForWeight.delete(chatId);
            this.deleteTrackedMessage(chatId, 1);

            const waterNorm = (weight * 0.035).toFixed(2);

            this.bot.sendMessage(chatId, `Спасибо! Твой вес: ${weight} кг.
                    \nРекомендуемая суточная норма воды: ${waterNorm} литров 💧`);
        });

        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const messageId = query.message?.message_id;
            const data = query?.data;

            if (data === CallbackData.CANCEL_ADD && typeof chatId !== "undefined") {
                this.waitingForWeight.delete(chatId);

                this.bot.editMessageText("Действие отменено.", {
                    chat_id: chatId,
                    message_id: messageId
                });
            }
        });
    }

    private sendWithTracking(chatId: number, text: string, index?: 0 | 1, options?: TelegramBot.SendMessageOptions): void {
        this.bot.sendMessage(chatId, text, options)
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
            ...options
        })
    }

    private deleteTrackedMessage(chatId: number, index: 0 | 1): void {
        if (typeof this.lastMessages[index] === "number") {
            this.bot.deleteMessage(chatId, this.lastMessages[index]);
            this.lastMessages[index] = undefined;
        }
    }
}

