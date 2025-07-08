import TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "./config/config.service";
import { Command } from "./commands/abstract.command";
import { StartCommand } from "./commands/command.start";
import { AddParametersCommand } from "./commands/command.add.parameters";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];
    private waitingForWeight: Set<number> = new Set();

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
    }

    private registerCommands(): void {
        this.commands = [
            new StartCommand(this.bot, this.waitingForWeight),
            new AddParametersCommand(this.bot, this.waitingForWeight)
        ];

        for (const command of this.commands) {
            command.handle();
        }
    }

    public init(): void {
        this.registerCommands();
    }
}

const config = new ConfigService();

const bot = new Bot(config.get("TOKEN"));
bot.init();