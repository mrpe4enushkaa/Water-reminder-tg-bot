import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isNotificationQueue } from "../utils/validators";

export class StartCommand extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue);
    }

    public handle(): void {
        this.bot.onText(/^\/start$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            this.bot.sendMessage(chatId, prompts.start.welcome(message.chat.username), { parse_mode: "HTML" });
        });
    }
}