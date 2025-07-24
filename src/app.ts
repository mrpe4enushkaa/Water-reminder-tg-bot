import TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "./config/config.service";
import { RedisService } from "./databases/redis/redis.service";
import { Command } from "./commands/abstract.command";
import { CallbackQueryCommand } from "./commands/command.callback-query";
import { StartCommand } from "./commands/command.start";
import { ParametersCommand } from "./commands/command.parameters";
import { DrinkWaterCommand } from "./commands/command.drink-water";
import { UserProvidedData } from "./models/user-provided-data.type";
import { HelpCommand } from "./commands/command.help";
import { TimeCommand } from "./commands/command.time";
import { ContinueCommand } from "./commands/command.continue";
import { StopCommand } from "./commands/command.stop";
import { MongoService } from "./databases/mongo/mongo.service";

class Bot {
    private bot: TelegramBot;
    private mongo: MongoService;
    private redis: RedisService;
    private commands: Command[] = [];

    private userProvidedData: Map<number, UserProvidedData> = new Map<number, UserProvidedData>;

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
        this.mongo = new MongoService();
        this.redis = new RedisService();
    }

    private setCommands(): void {
        this.bot.setMyCommands([
            { command: "/start", description: "🚀 Запустить бота и начать работу" },
            { command: "/add_parameters", description: "➕ Ввести параметры (вес и т.д.)" },
            { command: "/edit_parameters", description: "✏️ Изменить ранее введённые параметры" },
            { command: "/delete_parameters", description: "🗑️ Удалить все данные о себе" },
            { command: "/info_parameters", description: "📋 Посмотреть сохранённые параметры" },
            { command: "/drink", description: "💧 Отметить, что вы выпили воду" },
            { command: "/help", description: "ℹ️ Посмотреть инструкцию по использованию бота" },
            { command: "/time", description: "⏳ Узнать, когда будет следующее напоминание" },
            { command: "/continue", description: "🔔 Продолжить напоминания о воде" },
            { command: "/stop", description: "🔕 Остановить напоминания" },
            // { command: "/change_language", description: "🌐 Сменить язык бота" },
        ], {
            language_code: "ru"
        });
    }

    private registerCommands(): void {
        this.commands = [
            new CallbackQueryCommand(this.bot, this.userProvidedData, this.redis),
            new StartCommand(this.bot, this.userProvidedData, this.redis),
            new ParametersCommand(this.bot, this.userProvidedData, this.redis),
            new DrinkWaterCommand(this.bot, this.userProvidedData, this.redis),
            new HelpCommand(this.bot, this.userProvidedData, this.redis),
            new TimeCommand(this.bot, this.userProvidedData, this.redis),
            new ContinueCommand(this.bot, this.userProvidedData, this.redis),
            new StopCommand(this.bot, this.userProvidedData, this.redis)
        ];

        for (const command of this.commands) {
            command.handle();
        }
    }

    public async init(): Promise<void> {
        this.setCommands();
        this.registerCommands();
        this.redis.handle();
        await this.mongo.handle();
        this.mongo.createUsersSchema();
    }
}

const config = new ConfigService();

const bot = new Bot(config.get("BOT_TOKEN"));
bot.init();