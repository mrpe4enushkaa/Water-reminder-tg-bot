import TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "./config/config.service";
import { Command } from "./commands/abstract.command";
import { StartCommand } from "./commands/command.start";
import { AddParametersCommand } from "./commands/command.add-parameters";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];

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
            new StartCommand(this.bot),
            new AddParametersCommand(this.bot)
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