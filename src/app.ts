import TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "./config/config.service";
import { Command } from "./commands/command.main";
import { StartCommand } from "./commands/command.start";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(token, { polling: true });
    }

    private registerCommands(): void {
        this.commands.push(new StartCommand(this.bot));

        for (const command of this.commands) {
            command.handle();
        }
    }

    public init(): void {
        this.registerCommands();
    }
}

const config = new ConfigService();

const bot = new Bot(config.getToken());
bot.init();