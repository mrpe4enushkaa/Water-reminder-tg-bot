import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { prompts } from "../utils/prompts";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isNotification } from "../utils/validators";

export class StartCommand extends Command {
    constructor(bot: TelegramBot, waitingStates: Map<number, WaitingStates>, lastMessage: Map<number, MessagesIdsTuple>) {
        super(bot, waitingStates, lastMessage);
    }

    public handle(): void {
        this.bot.onText(/^\/start$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotification(chatId, this.waitingStates)) return;

            this.bot.sendMessage(chatId, prompts.start.welcome(message.chat.username), { parse_mode: "HTML" });
        });
    }
}