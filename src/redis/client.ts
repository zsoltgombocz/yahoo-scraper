import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export const client: RedisClientType = createClient({
    url: process.env.REDIS_URL,
});

client.on('error', err => {
    logger.error('REDIS:', err);
    process.exit(1);
});

client.on('connect', () => {
    logger.info('REDIS: Connected to Redis!');
});

export const nonStockKeys = ['finviz', 'yahoo'];