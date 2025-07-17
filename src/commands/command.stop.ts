import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { isNotificationQueue } from "../utils/validators";

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
        this.bot.onText(/^\/time$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            this.bot.sendMessage(chatId, "Остановить отправку уведомлений");
        });
    }
}