import TelegramBot from "node-telegram-bot-api";
import { prompts } from "./prompts";

export const drinkVolumeOptions: TelegramBot.SendMessageOptions = {
    reply_markup: {
        keyboard: [
            [{ text: '200 мл' }, { text: '250 мл' }, { text: '300 мл' }],
            [{ text: '350 мл' }, { text: '400 мл' }],
            [{ text: prompts.notification.keyboardChoice }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
        input_field_placeholder: "Выберите объём воды",
    }
};