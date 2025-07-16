import TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "./config/config.service";
import { Command } from "./commands/abstract.command";
import { OnMessage } from "./commands/command.on-message";
import { CallbackQueryCommand } from "./commands/command.callback-query";
import { StartCommand } from "./commands/command.start";
import { ParametersCommand } from "./commands/command.parameters";
import { DrinkWaterCommand } from "./commands/command.drink-water";
import { MessagesIdsTuple } from "./models/messages-ids.type";
import { WaitingStates } from "./models/waiting-states.type";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];

    private waitingStates: Map<number, WaitingStates> = new Map<number, WaitingStates>;
    private lastMessages: Map<number, MessagesIdsTuple> = new Map<number, MessagesIdsTuple>;
    private notificationQueue: Set<number> = new Set();
    private editUserParameters: Set<number> = new Set();

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
    }

    private setCommands(): void {
        this.bot.setMyCommands([
            { command: "/start", description: "Старт бота" },
            { command: "/add_parameters", description: "Ввести параметры" },
            { command: "/edit_parameters", description: "Изменить параметры" },
            { command: "/drink", description: "Выпил(а) воду" }
        ], {
            language_code: "ru"
        });
    }

    private registerCommands(): void {
        this.commands = [
            new OnMessage(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters),
            new CallbackQueryCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters),
            new StartCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters),
            new ParametersCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters),
            new DrinkWaterCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters),
        ];

        for (const command of this.commands) {
            command.handle();
        }
    }

    public init(): void {
        this.setCommands();
        this.registerCommands();
    }
}

const config = new ConfigService();

const bot = new Bot(config.get("BOT_TOKEN"));
bot.init();