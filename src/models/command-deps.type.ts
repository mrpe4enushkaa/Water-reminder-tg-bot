import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import { RedisService } from "../databases/redis/redis.service";
import { TranslateService } from "../translate/translate.service";
import { TimeService } from "../time/time.service";
import { TimezoneService } from "../timezone/timezone.service";
import { UserData } from "./user-data.type";

export type CommandDeps = [
    TelegramBot,
    mongoose.Model<UserData>,
    RedisService,
    TranslateService,
    TimeService,
    TimezoneService
];