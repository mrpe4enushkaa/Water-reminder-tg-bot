import Redis from "ioredis";

export interface RedisOptions {
    handle(): Redis;

    hset(key: string, data: Record<string, string>): Promise<number>;
    hget(key: string): Promise<Record<string, string>>;
    hdelete(key: string): Promise<number>;

    sadd(key: string, data: string): Promise<number>;
    sismember(key: string, data: string): Promise<number>;
    sremove(key: string, data: string): Promise<number>;

    expire(key: string, time: number): Promise<number>;
}