"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const config_1 = require("./config/config");
const command_start_1 = require("./commands/command.start");
class Bot {
    constructor(token) {
        this.token = token;
        this.commands = [];
        this.bot = new node_telegram_bot_api_1.default(token, { polling: true });
    }
    registerCommands() {
        this.commands.push(new command_start_1.StartCommand(this.bot));
        for (const command of this.commands) {
            command.handle();
        }
    }
    init() {
        this.registerCommands();
    }
}
const config = new config_1.Config();
const bot = new Bot(config.getToken());
bot.init();
