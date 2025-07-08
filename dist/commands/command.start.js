"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartCommand = void 0;
const command_main_1 = require("./command.main");
class StartCommand extends command_main_1.Command {
    constructor(bot) {
        super(bot);
    }
    handle() {
        this.bot.onText(/^\/start$/, (message) => {
            this.bot.sendMessage(message.chat.id, `Hello ${message.chat.username}`);
        });
    }
}
exports.StartCommand = StartCommand;
