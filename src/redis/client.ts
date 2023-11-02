import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export const client: RedisClientType = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD
});

client.on('error', err => {
    logger.error('REDIS:', err);
    process.exit(1);
});

client.on('connect', () => {
    logger.info('REDIS: Connected to Redis!');
});

export const nonStockKeys = ['finviz', 'yahoo'];