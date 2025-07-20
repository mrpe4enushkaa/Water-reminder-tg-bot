import TelegramBot from "node-telegram-bot-api";
import Redis from "ioredis";
import { ConfigService } from "./config/config.service";
import { RedisService } from "./databases/redis/redis.service";
import { Command } from "./commands/abstract.command";
import { OnMessage } from "./commands/command.on-message";
import { CallbackQueryCommand } from "./commands/command.callback-query";
import { StartCommand } from "./commands/command.start";
import { ParametersCommand } from "./commands/command.parameters";
import { DrinkWaterCommand } from "./commands/command.drink-water";
import { MessagesIdsTuple } from "./models/messages-ids.type";
import { WaitingStates } from "./models/waiting-states.type";
import { UserProvidedData } from "./models/user-provided-data.type";
import { HelpCommand } from "./commands/command.help";
import { TimeCommand } from "./commands/command.time";
import { ContinueCommand } from "./commands/command.continue";
import { StopCommand } from "./commands/command.stop";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];
    private redis: RedisService;

    private waitingStates: Map<number, WaitingStates> = new Map<number, WaitingStates>;
    private lastMessages: Map<number, MessagesIdsTuple> = new Map<number, MessagesIdsTuple>;
    private notificationQueue: Set<number> = new Set();
    private editUserParameters: Set<number> = new Set();
    private userProvidedData: Map<number, UserProvidedData> = new Map<number, UserProvidedData>;

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
        this.redis = new RedisService();
        this.redis.handle();
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
            new OnMessage(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new CallbackQueryCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new StartCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new ParametersCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new DrinkWaterCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new HelpCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new TimeCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new ContinueCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
            new StopCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData, this.redis),
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