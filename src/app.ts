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
import { UserProvidedData } from "./models/user-provided-data.type";
import { HelpCommand } from "./commands/command.help";
import { TimeCommand } from "./commands/command.time";

class Bot {
    private bot: TelegramBot;
    private commands: Command[] = [];

    private waitingStates: Map<number, WaitingStates> = new Map<number, WaitingStates>;
    private lastMessages: Map<number, MessagesIdsTuple> = new Map<number, MessagesIdsTuple>;
    private notificationQueue: Set<number> = new Set();
    private editUserParameters: Set<number> = new Set();
    private userProvidedData: Map<number, UserProvidedData> = new Map<number, UserProvidedData>;

    constructor(private readonly token: string) {
        this.bot = new TelegramBot(this.token, { polling: true });
    }

    private setCommands(): void {
        this.bot.setMyCommands([
            { command: "/start", description: "Старт бота" },
            { command: "/add_parameters", description: "Ввести параметры" },
            { command: "/edit_parameters", description: "Изменить параметры" },
            { command: "/info_parameters", description: "Посмотреть параметры" },
            { command: "/drink", description: "Выпил(а) воду" },
            { command: "/help", description: "Инструкция по командам" },
            { command: "/time", description: "Время до следующего уведомления" },
            { command: "/stop", description: "Прекратить напоминать" },
            // { command: "/delete_parameters", description: "Удалить данные о пользователе" },
            // { command: "/change_language", description: "Изменение языка бота" },
        ], {
            language_code: "ru"
        });
    }

    private registerCommands(): void {
        this.commands = [
            new OnMessage(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
            new CallbackQueryCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
            new StartCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
            new ParametersCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
            new DrinkWaterCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
            new HelpCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
            new TimeCommand(this.bot, this.waitingStates, this.lastMessages, this.notificationQueue, this.editUserParameters, this.userProvidedData),
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