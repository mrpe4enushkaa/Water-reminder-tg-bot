import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { isNotificationQueue } from "../utils/validators";
import { prompts } from "../utils/prompts";
import { UserProvidedData } from "../models/user-provided-data.type";
import { RedisService } from "../databases/redis/redis.service";

export class OnMessage extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>,
        editUserParameters: Set<number>,
        userProvidedData: Map<number, UserProvidedData>,
        redis: RedisService
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue, editUserParameters, userProvidedData, redis);
    }

    handle(): void {
        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            if (message.text?.startsWith("/")) {
                const trackedMessages = this.getLastMessages(chatId);

                if (this.waitingStates.get(chatId) !== WaitingStates.DRINK && this.waitingStates.get(chatId) !== WaitingStates.CHOICE) {
                    if (typeof trackedMessages[0] !== "undefined") {
                        this.bot.editMessageText(prompts.cancel, {
                            chat_id: chatId,
                            message_id: trackedMessages[0],
                            parse_mode: "HTML",
                        });
                    }

                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[1]);
                    }
                } else {
                    if (typeof trackedMessages[1] !== "undefined") {
                        this.bot.editMessageText(prompts.cancel, {
                            chat_id: chatId,
                            message_id: trackedMessages[1],
                            parse_mode: "HTML",
                        });
                    }

                    if (typeof trackedMessages[0] !== "undefined") {
                        this.bot.deleteMessage(chatId, trackedMessages[0]);
                    }
                }

                this.waitingStates.delete(chatId);
                this.clearLastMessages(chatId);
                this.editUserParameters.delete(chatId);
                return;
            };

            if (!this.waitingStates.has(chatId)) {
                this.bot.deleteMessage(chatId, message.message_id);
                return;
            }
        });
    }
}