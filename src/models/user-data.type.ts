export type UserData = {
    telegramChatId: number;
    username: string | undefined;
    weight: number | undefined;
    city: string | undefined;
    timezone: string | undefined;
    time: [string, string] | undefined;
    goal: number | undefined;
    mute: boolean;
}