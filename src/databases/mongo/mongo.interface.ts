import { UserModel } from "../../models/user-model.type";

export interface MongoOptions {
    handle(): Promise<void>;
    disconnect(): Promise<void>;
    createUsersSchema(): void;
    addUser(data: UserModel): Promise<void>;
    editUser(data: UserModel): Promise<void>;
    deleteUser(telegramId: number): Promise<void>;
    continueSendPushNotifications(telegramId: number): Promise<void>;
    stopSendPushNotifications(telegramId: number): Promise<void>;
}