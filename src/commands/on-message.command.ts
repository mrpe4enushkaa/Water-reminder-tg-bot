import TelegramBot from "node-telegram-bot-api";
import { Command } from "./abstract.command";
import { WaitingStates } from "../models/waiting-states.type";
import { MessagesIdsTuple } from "../models/messages-ids.type";

export class OnMessage extends Command {
    constructor(bot: TelegramBot, waitingStates = new Map<number, WaitingStates>, lastMessages: MessagesIdsTuple) {
        super(bot, waitingStates, lastMessages);
    }

    handle(): void {
        this.bot.on("message", (message): void => {

        });
    }
}