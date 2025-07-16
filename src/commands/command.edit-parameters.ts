import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";

export class EditParametersCommand extends Command {
    constructor(
        bot: TelegramBot,
        waitingStates: Map<number, WaitingStates>,
        lastMessages: Map<number, MessagesIdsTuple>,
        notificationQueue: Set<number>
    ) {
        super(bot, waitingStates, lastMessages, notificationQueue);
    }

    public handle(): void {
        
    }
}