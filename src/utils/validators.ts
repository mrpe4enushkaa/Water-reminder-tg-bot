import { RedisService } from "../databases/redis/redis.service";

export const isValidWeight = (text: string) =>
    /^(\d+(\.\d+)?)(\s?кг)?$/i.test(text.trim()) && parseFloat(text) > 0;

export const isValidCity = (text: string) =>
    /^[A-ZА-ЯЁ][a-zа-яё\- ]{2,49}$/iu.test(text.trim());

export const isValidTime = (text: string) =>
    /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/.test(text.trim());


export const isValidVolume = (text: string) =>
    /^(\d+)(\s?мл)?$/i.test(text.trim()) && parseFloat(text) > 0;

export const isNotificationQueue = async (chatId: number, redis: RedisService): Promise<number | void> =>
    await redis.sismember("notification-queue", chatId);
