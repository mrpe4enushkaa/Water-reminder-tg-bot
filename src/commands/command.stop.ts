import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { isNotificationQueue } from "../utils/validators";
import { inlineKeyboardCancel } from "../utils/reply-markups";

export class StopCommand extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>,
        editUserParameters: Set<number>,
        userProvidedData: Map<number, UserProvidedData>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue, editUserParameters, userProvidedData);
    }

    public handle(): void {
        this.bot.onText(/^\/stop$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            this.waitingStates.set(chatId, WaitingStates.STOP);

            this.bot.sendMessage(chatId, `Чтобы остановить отправку пуш уведомлений, напишите "Остановить"`, {
                ...inlineKeyboardCancel,
                parse_mode: "HTML"
            }).then(lastMessage => {
                this.setLastMessages(chatId, [lastMessage.message_id, undefined]);
            });
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;
            const text = message.text || "";

            if (this.waitingStates.get(chatId) === WaitingStates.STOP) {
                if (text !== "Остановить") {
                    this.bot.deleteMessage(chatId, message.message_id);
                    return;
                }

                this.bot.sendMessage(chatId, "Пуш уведомления остановлены. Чтобы продолжить получать уведомления от бота, воспользуйтесь командой /continue");

                this.waitingStates.delete(chatId);
                this.clearLastMessages(chatId);
            }
        });
    }
}