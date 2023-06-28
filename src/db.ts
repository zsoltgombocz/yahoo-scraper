import { createClient, RedisClientType } from 'redis';
import 'dotenv/config';

export const client: RedisClientType = createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`

});

client.on('error', err => console.log('Redis error:', err));

client.on('connect', () => {
    console.log('Connected to Redis!');
});