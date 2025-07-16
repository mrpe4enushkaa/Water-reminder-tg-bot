import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../models/callback-data.enum";
import { prompts } from "../utils/prompts";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";

export class CallbackQueryCommand extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue);
    }

    public handle(): void {
        this.bot.on("callback_query", (query): void => {
            const chatId = query.message?.chat.id;
            const data = query?.data;

            if (typeof data === "string" && typeof chatId !== "undefined" && this.waitingStates.has(chatId)) {
                const trackedMessages = this.getLastMessages(chatId);

                if (data === CallbackData.CANCEL_ADD) {
                    if (typeof trackedMessages[0] !== "undefined") {
                        this.bot.editMessageText(prompts.cancel, {
                            chat_id: chatId,
                            message_id: trackedMessages[0],
                            parse_mode: "HTML"
                        });
                    }
                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[1]);
                    }

                    this.waitingStates.delete(chatId);
                    this.notificationQueue.delete(chatId);
                    this.clearLastMessages(chatId);
                }

                if (data === CallbackData.SNOOZE) {
                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.editMessageText(prompts.drinkWater.clickedSnooze, {
                            chat_id: chatId,
                            message_id: trackedMessages[1]
                        });
                    }
                    if (typeof trackedMessages[0] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[0]);
                    }

                    this.clearLastMessages(chatId);
                    this.notificationQueue.delete(chatId);
                    this.waitingStates.delete(chatId);
                }
            }
        });
    }
}