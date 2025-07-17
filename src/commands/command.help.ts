import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { isNotificationQueue } from "../utils/validators";
import { prompts } from "../utils/prompts";

export class HelpCommand extends Command {
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
        this.bot.onText(/^\/help$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            this.bot.sendMessage(chatId, prompts.help, {
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true
                }
            });
        });
    }
}