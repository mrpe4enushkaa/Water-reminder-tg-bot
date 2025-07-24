export type UserModel = {
    telegramId: number | undefined;
    weight: number | undefined;
    city: string | undefined;
    time: [string, string] | [undefined, undefined];
    goal: number | undefined;
    mute: boolean;
}