"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ quiet: true });
// export const config: IConfig = {
//     token: process.env.TOKEN || (() => { throw new Error("TOKEN not found") })()
// };
class Config {
    constructor() {
        const token = process.env.TOKEN;
        if (!token) {
            throw new Error("TOKEN not found");
        }
        this.config = token;
    }
    getToken() {
        return this.config;
    }
}
exports.Config = Config;
