import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { MessagesIdsTuple } from "../types/messageIdsTuple.type";
import { CallbackData } from "../types/callbackData.enum";

export class AddParametersCommand extends Command {
    //-------------------------------------------0----------1----//
    private waitingForWeight: Set<number> = new Set();
    private waitingForTime: Set<number> = new Set();
    private lastMessages: MessagesIdsTuple = [undefined, undefined];
    private dailyGoal: number = 0;
    private weight: number = 0

    private markupCancel: TelegramBot.SendMessageOptions = {
        reply_markup: {
            inline_keyboard: [[{ text: "Отменить действие", callback_data: CallbackData.CANCEL_ADD }]]
        }
    }

    constructor(bot: TelegramBot) {
        super(bot);
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

            if (message.text?.startsWith("/")) {
                this.waitingForWeight.delete(chatId);
                this.waitingForTime.delete(chatId);
                if (typeof this.lastMessages[0] !== "undefined") {
                    this.bot.editMessageText("Действие отменено.", {
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

            if (this.waitingForWeight.has(chatId)) {
                if (typeof this.lastMessages[1] === "undefined") {
                    this.editTrackedMessage(
                        chatId,
                        `<b>💧 Введите ваш вес, чтобы я мог рассчитать норму воды на день!</b>
                        \n<i>Забота о себе начинается с маленьких шагов 😊</i>`,
                        0,
                        { parse_mode: "HTML" }
                    );
                }

                const text = message?.text?.trim() || "";
                const weight = parseFloat(text);

                const isValid = /^(\d+(\.\d+)?)(\s?кг)?$/i.test(text) && weight > 0;

                if (!isValid) {
                    this.bot.deleteMessage(chatId, message.message_id);
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

                this.deleteTrackedMessage(chatId, 1);

                this.dailyGoal = parseFloat((weight * 0.035).toFixed(2));
                this.weight = weight;

                this.waitingForWeight.delete(chatId);
                this.waitingForTime.add(chatId);

                this.lastMessages = [undefined, undefined];

                this.sendWithTracking(
                    chatId,
                    `⏰ Теперь отправь время, когда ты просыпаешься и ложишься спать 😴
                    \nФормат такой: 07:30, 23:00 (вид: 00:00 – 23:59) 🕒
                    \nПример: 08:00, 22:30 ✅`,
                    0,
                    { ...this.markupCancel }
                );
                return;
            }

            if (this.waitingForTime.has(chatId)) {
                if (typeof this.lastMessages[1] === "undefined") {
                    this.editTrackedMessage(
                        chatId,
                        `⏰ Теперь отправь время, когда ты просыпаешься и ложишься спать 😴
                        \nФормат такой: 07:30, 23:00 (вид: 00:00 – 23:59) 🕒
                        \nПример: 08:00, 22:30 ✅`,
                        0,
                        { parse_mode: "HTML" }
                    );
                }

                const text = message?.text?.trim() || "";
                const isValid = /^([01]\d|2[0-3]):[0-5]\d,\s?([01]\d|2[0-3]):[0-5]\d$/.test(text);

                if (!isValid) {
                    this.bot.deleteMessage(chatId, message.message_id);
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

                this.waitingForTime.delete(chatId);
                this.deleteTrackedMessage(chatId, 1);

                this.bot.sendMessage(chatId, `Спасибо! Твой вес: ${this.weight} кг.
                        \nРекомендуемая суточная норма воды: ${this.dailyGoal} литров 💧`);
                return;
            }
        });

        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const data = query?.data;

            if (data === CallbackData.CANCEL_ADD && typeof chatId !== "undefined") {
                this.waitingForWeight.delete(chatId);
                this.waitingForTime.delete(chatId);
                if (typeof this.lastMessages[0] === "number") {
                    this.editTrackedMessage(chatId, "Действие отменено.", 0);
                }
                if (typeof this.lastMessages[1] === "number") {
                    this.deleteTrackedMessage(chatId, 1);
                }
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
        });
    }

    private deleteTrackedMessage(chatId: number, index: 0 | 1): void {
        if (typeof this.lastMessages[index] === "number") {
            this.bot.deleteMessage(chatId, this.lastMessages[index]);
            this.lastMessages[index] = undefined;
        }
    }
}

