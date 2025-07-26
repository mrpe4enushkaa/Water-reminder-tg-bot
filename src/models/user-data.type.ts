export type UserData = {
    telegramChatId: number;
    weight: number | undefined;
    city: string | undefined;
    timezone: string | undefined;
    time: [string, string] | undefined;
    goal: number | undefined;
    mute: boolean;
}