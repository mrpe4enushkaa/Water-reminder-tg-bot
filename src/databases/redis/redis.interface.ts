import Redis from "ioredis";

export interface RedisOptions {
    handle(): Redis;

    set(key: string, data: number): Promise<string>;
    get(key: string): Promise<string | null>;
    delete(key: string): Promise<number>;

    hset(key: string, data: Record<string, string>): Promise<number>;
    hget(key: string): Promise<Record<string, string>>;
    hdelete(key: string): Promise<number>;

    sadd(key: string, data: number | string): Promise<number>;
    sismember(key: string, data: number | string): Promise<number>;
    sremove(key: string, data: number | string): Promise<number>;

    expire(key: string, time: number): Promise<number>;
}