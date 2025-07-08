import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";

export class AddParametersCommand extends Command {
    private readonly markupCancel: TelegramBot.SendMessageOptions = {
        reply_markup: {
            inline_keyboard: [[{ text: "Отменить действие", callback_data: "CANCEL_ADD" }]]
        }
    }
    //----------------------------0-------------------1-----------------------------------//
    private lastMessages: [number | undefined, number | undefined] = [undefined, undefined];

    constructor(bot: TelegramBot, waitingForWeight: Set<number>) {
        super(bot, waitingForWeight);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            this.waitingForWeight.add(chatId);
            //-----------------------------------------------0-----------------------------------------------//
            this.bot.sendMessage(chatId, `<b>💧 Введите ваш вес, чтобы я мог рассчитать норму воды на день!</b>
                \n<i>Забота о себе начинается с маленьких шагов 😊</i>`,
                {
                    parse_mode: "HTML",
                    ...this.markupCancel
                }
            ).then(sentMessage => this.lastMessages[0] = sentMessage.message_id);
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            if (!this.waitingForWeight.has(chatId)) return;

            if (message.text?.startsWith("/")) {
                this.waitingForWeight.delete(chatId);
                return;
            };

            if (this.waitingForWeight.has(chatId)) {
                const weight = parseFloat(message.text || "");

                if (isNaN(weight) || weight <= 0) {
                    this.bot.deleteMessage(chatId, message.message_id);

                    if (typeof this.lastMessages[0] === "number") {
                        this.bot.deleteMessage(chatId, this.lastMessages[0]);
                        this.lastMessages[0] = undefined;
                    };

                    //-------------------------------------1--------------------------------------//
                    if (typeof this.lastMessages[1] === "undefined") {
                        this.bot.sendMessage(chatId, "Пожалуйста, введите корректное число для веса.", {
                            ...this.markupCancel
                        }).then(sentMessage => this.lastMessages[1] = sentMessage.message_id);
                    } 
                    return;
                }

                this.waitingForWeight.delete(chatId);

                const waterNorm = (weight * 0.035).toFixed(2);

                this.bot.sendMessage(chatId, `Спасибо! Твой вес: ${weight} кг.
                    \nРекомендуемая суточная норма воды: ${waterNorm} литров 💧`);
            }
        });

        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const messageId = query.message?.message_id;
            const data = query?.data;

            if (data === "CANCEL_ADD" && typeof chatId !== "undefined") {
                this.waitingForWeight.delete(chatId);

                this.bot.editMessageText("Действие отменено.", {
                    chat_id: chatId,
                    message_id: messageId
                });
            }
        });
    }
}

