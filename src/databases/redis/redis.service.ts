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

    public async set(key: string, data: number | object, time?: number): Promise<string> {
        if (time) {
            return await this.client.set(key, JSON.stringify(data), "EX", time);
        } else {
            return await this.client.set(key, JSON.stringify(data));
        }
    }

    public async get<T = any>(key: string): Promise<T | null> {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
    }

    public async delete(key: string): Promise<number> {
        return await this.client.del(key);
    }

    public async hset(key: string, data: Record<string, string | undefined>): Promise<number> {
        return await this.client.hset(key, data);
    }

    public async hget(key: string): Promise<Record<string, string>> {
        return await this.client.hgetall(key);
    }

    public async hdelete(key: string): Promise<number> {
        return await this.client.hdel(key);
    }

    public async sadd(key: string, data: number | string): Promise<number> {
        return await this.client.sadd(key, String(data));
    }

    public async sismember(key: string, data: number | string): Promise<number> {
        return await this.client.sismember(key, String(data));
    }

    public async sremove(key: string, data: number | string): Promise<number> {
        return await this.client.srem(key, String(data));
    }

    public async expire(key: string, time: number): Promise<number> {
        return await this.client.expire(key, time);
    }
}