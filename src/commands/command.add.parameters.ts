import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";

export class AddParametersCommand extends Command {
    constructor(bot: TelegramBot, waitingForWeight: Set<number>) {
        super(bot, waitingForWeight);
    }

    public handle(): void {
        this.bot.onText(/^\/add_parameters$/, (message): void => {
            const chatId = message.chat.id;

            this.waitingForWeight.add(chatId);

            this.bot.sendMessage(chatId, `<b>💧 Введите ваш вес, чтобы я мог рассчитать норму воды на день!</b>
                \n<i>Забота о себе начинается с маленьких шагов 😊</i>`, {
                parse_mode: "HTML"
            });
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
                    this.bot.sendMessage(chatId, "Пожалуйста, введите корректное число для веса.");
                    return;
                }

                this.waitingForWeight.delete(chatId);

                const waterNorm = (weight * 0.035).toFixed(2);

                this.bot.sendMessage(chatId, `Спасибо! Твой вес: ${weight} кг.
                    \nРекомендуемая суточная норма воды: ${waterNorm} литров 💧`);
            }
        });
    }
}

