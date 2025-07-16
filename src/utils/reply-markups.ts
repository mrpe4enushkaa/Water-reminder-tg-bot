import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../models/callback-data.enum";
import { prompts } from "./prompts";

export const inlineKeyboardCancel: TelegramBot.SendMessageOptions = {
    reply_markup: {
        inline_keyboard: [[{ text: prompts.markupCancel, callback_data: CallbackData.CANCEL_ADD }]]
    }
}

export const keyboardVolumeOptions: TelegramBot.SendMessageOptions = {
    reply_markup: {
        keyboard: [
            [{ text: '200 мл' }, { text: '250 мл' }, { text: '300 мл' }],
            [{ text: '350 мл' }, { text: '400 мл' }],
            [{ text: prompts.drinkWater.keyboardChoice }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        input_field_placeholder: "Выберите объём воды",
    }
};

export const inlineKeyboardSnooze: TelegramBot.SendMessageOptions = {
    reply_markup: {
        inline_keyboard: [
            [{ text: prompts.drinkWater.markupSnooze, callback_data: CallbackData.SNOOZE }]
        ]
    }
}