import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";
import { UserProvidedData } from "../models/user-provided-data.type";
import { isNotificationQueue } from "../utils/validators";
import { inlineKeyboardCancel } from "../utils/reply-markups";
import { prompts } from "../utils/prompts";
import { RedisService } from "../databases/redis/redis.service";

export class StopCommand extends Command {
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

    public handle(): void {
        this.bot.onText(/^\/stop$/, (message): void => {
            const chatId = message.chat.id;

            if (isNotificationQueue(chatId, this.notificationQueue)) return;

            this.waitingStates.set(chatId, WaitingStates.STOP);

            this.bot.sendMessage(chatId, prompts.stop.ask, {
                ...inlineKeyboardCancel,
                parse_mode: "HTML",
                reply_markup: {
                    remove_keyboard: true,
                    ...inlineKeyboardCancel.reply_markup
                }
            }).then(lastMessage => this.setLastMessages(chatId, [lastMessage.message_id, undefined]));
        });

        this.bot.on("message", (message): void => {
            const chatId = message.chat.id;
            const text = message.text || "";

            if (this.waitingStates.get(chatId) === WaitingStates.STOP) {
                if (text.toLocaleLowerCase() !== "остановить") {
                    this.bot.deleteMessage(chatId, message.message_id);
                    return;
                }

                const trackedMessages = this.getLastMessages(chatId);

                if (typeof trackedMessages[0] !== "undefined") {
                    this.bot.editMessageText(prompts.stop.ask, {
                        chat_id: chatId,
                        message_id: trackedMessages[0],
                        parse_mode: "HTML"
                    });
                }

                this.bot.sendMessage(chatId, prompts.stop.stopped, {
                    parse_mode: "HTML"
                });

                this.waitingStates.delete(chatId);
                this.clearLastMessages(chatId);
            }
        });
    }
}