import Redis from "ioredis";
import { config, DotenvParseOutput } from "dotenv";
import { RedisOptions } from "./redis.interface";

export class RedisService implements RedisOptions {
    private config: DotenvParseOutput;
    private client!: Redis;

    constructor() {
        const { error, parsed } = config();

        if (error) {
            throw new Error(`File ".env" not found`);
        }
        if (!parsed) {
            throw new Error(`File ".env" is empty`);
        }

        this.config = parsed;
    }

    public handle(): Redis {
        const host = this.config.REDIS_HOST;
        const port = Number(this.config.REDIS_PORT);

        if (!host || !port) {
            throw new Error("The REDIS_HOST or REDIS_PORT variables are not set");
        }

        this.client = new Redis({
            host,
            port
        });

        this.client.on("connect", (): void => console.log("Redis has been connected"));
        this.client.on("error", (error): void => console.error(error));

        return this.client;
    }

    public async hset(key: string, data: Record<string, string>): Promise<number> {
        return await this.client.hset(key, data);
    }

    public async hget(key: string): Promise<Record<string, string>> {
        return await this.client.hgetall(key);
    }

    public async hdelete(key: string): Promise<number> {
        return await this.client.hdel(key);
    }

    public async sadd(key: string, data: number | string): Promise<number> {
        return await this.client.sadd(key, data.toString());
    }

    public async sismember(key: string, data: number | string): Promise<number> {
        return await this.client.sismember(key, data.toString());
    }

    public async sremove(key: string, data: number | string): Promise<number> {
        return await this.client.srem(key, data.toString());
    }

    public async expire(key: string, time: number): Promise<number> {
        return await this.client.expire(key, time);
    }
}