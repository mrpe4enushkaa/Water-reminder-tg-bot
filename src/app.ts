import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import { ConfigService } from "./config/config.service";
import { RedisService } from "./databases/redis/redis.service";
import { MongoService } from "./databases/mongo/mongo.service";
import { UserData } from "./models/user-data.type";
import { Command } from "./commands/abstract.command";
import { CallbackQueryCommand } from "./commands/command.callback-query";
import { StartCommand } from "./commands/command.start";
import { ParametersCommand } from "./commands/command.parameters";
import { DrinkWaterCommand } from "./commands/command.drink-water";
import { HelpCommand } from "./commands/command.help";
import { TimeCommand } from "./commands/command.time";
import { ContinueCommand } from "./commands/command.continue";
import { StopCommand } from "./commands/command.stop";
import { TimezoneService } from "./timezone/timezone.service";
import { TranslateService } from "./translate/translate.service";
import { TimeService } from "./time/time.service";
import { CommandDeps } from "./models/command-deps.type";

class Bot {
    private bot: TelegramBot;
    private mongo: MongoService;
    private redis: RedisService;
    private commands: Command[] = [];
    private timezone: TimezoneService;
    private translate: TranslateService;
    private time: TimeService;

    private userSchema: mongoose.Model<UserData>;

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
        this.mongo = new MongoService();
        this.redis = new RedisService();
        this.timezone = new TimezoneService();
        this.translate = new TranslateService();
        this.time = new TimeService();

        this.userSchema = this.mongo.createSchema<UserData>("Users", {
            telegramChatId: { type: Number, required: true },
            username: { type: String, required: true },
            weight: { type: Number, required: true },
            city: { type: String, required: true },
            timezone: { type: String, required: true },
            time: {
                type: [String],
                required: true,
                validate: {
                    validator: (value: string[]) => value.length === 2,
                    message: "The 'time' field must contain exactly two values (for example, ['08:00', '20:00'])"
                }
            },
            goal: { type: Number, required: true },
            mute: { type: Boolean, required: true }
        });
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
        const deps: CommandDeps = [
            this.bot,
            this.userSchema,
            this.redis,
            this.translate,
            this.time,
            this.timezone
        ];

        const commands = [
            CallbackQueryCommand,
            StartCommand,
            ParametersCommand,
            DrinkWaterCommand,
            HelpCommand,
            TimeCommand,
            ContinueCommand,
            StopCommand
        ];

        this.commands = commands.map(Command => new Command(...deps))

        for (const command of this.commands) {
            command.handle();
        }
    }

    public async init(): Promise<void> {
        await this.mongo.handle();
        this.redis.handle();
        this.setCommands();
        this.registerCommands();
    }
}

const config = new ConfigService();

const bot = new Bot(config.get("BOT_TOKEN"));
bot.init();