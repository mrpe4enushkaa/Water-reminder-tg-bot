import TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "./config/config.service";
import { Command } from "./commands/abstract.command";
import { StartCommand } from "./commands/command.start";
import { AddParametersCommand } from "./commands/command.add-parameters";
import { NotificationCommand } from "./commands/command.notification";
import { MessagesIdsTuple } from "./models/messages-ids.type";
import { WaitingStates } from "./models/waiting-states.type";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];

    private waitingStates: Map<number, WaitingStates> = new Map<number, WaitingStates>;
    // private lastMessages: MessagesIdsTuple = [undefined, undefined];
    private lastMessages: Map<number, MessagesIdsTuple> = new Map<number, MessagesIdsTuple>;

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
    }

    private setCommands(): void {
        this.bot.setMyCommands([
            { command: "/start", description: "Старт бота" },
            { command: "/add_parameters", description: "Ввести параметры" }
        ], {
            language_code: "ru"
        });
    }

    private registerCommands(): void {
        this.commands = [
            new StartCommand(this.bot, this.waitingStates, this.lastMessages),
            new AddParametersCommand(this.bot, this.waitingStates, this.lastMessages),
            new NotificationCommand(this.bot, this.waitingStates, this.lastMessages)
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