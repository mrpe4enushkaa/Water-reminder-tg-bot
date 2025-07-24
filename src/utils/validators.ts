import { UserData } from "../models/user-data.type";

export const isValidWeight = (text: string) =>
    /^(\d+(\.\d+)?)(\s?кг)?$/i.test(text.trim()) && parseFloat(text) > 0;

export const isValidCity = (text: string) =>
    /^[A-ZА-ЯЁ][a-zа-яё\- ]{2,49}$/iu.test(text.trim());

export const isValidTime = (text: string) =>
    /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/.test(text.trim());

export const isValidVolume = (text: string) =>
    /^(\d+)(\s?мл)?$/i.test(text.trim()) && parseFloat(text) > 0;

export const isValidUser = (data: Partial<UserData>): data is UserData => {
    return (
        typeof data.telegramChatId === "number" &&
        typeof data.weight === "number" &&
        typeof data.city === "string" &&
        Array.isArray(data.time) &&
        data.time.length === 2 &&
        typeof data.time[0] === "string" &&
        typeof data.time[1] === "string" &&
        typeof data.goal === "number" &&
        typeof data.mute === "boolean"
    );
}