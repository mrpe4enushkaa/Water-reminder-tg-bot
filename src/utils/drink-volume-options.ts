import TelegramBot from "node-telegram-bot-api";
import { NotificationPrompts } from "../models/notification-prompts.type";
import { CallbackData } from "../models/callback-data.enum";

export const drinkVolumeOptions = (prompts: NotificationPrompts): TelegramBot.SendMessageOptions => {
    const keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [
            { text: "200 мл", callback_data: CallbackData.DRANK_200 },
            { text: "250 мл", callback_data: CallbackData.DRANK_250 },
        ],
        [
            { text: "300 мл", callback_data: CallbackData.DRANK_300 },
            { text: "350 мл", callback_data: CallbackData.DRANK_350 },
        ],
        [{ text: prompts.choice, callback_data: CallbackData.CHOICE }],
    ];

    if (prompts.snooze) {
        keyboard.push([{ text: prompts.snooze, callback_data: CallbackData.SNOOZE }]);
    }

    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    }
};