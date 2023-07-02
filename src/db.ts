import { createClient, RedisClientType } from 'redis';
import 'dotenv/config';
import { nonStockKeys } from './utils';

export const client: RedisClientType = createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`

});

client.on('error', err => console.log('Redis error:', err));

client.on('connect', () => {
    console.log('Connected to Redis!');
});
export interface stockFinancialDataInterface {
    annual: annualDataInterface[],
    quarterly: quarterlyDataInterface[],
}

export interface annualDataInterface {
    year: number;
    totalAssets: number | null;
    totalDebt: number | null;
    netTangibleAssets: number | null;
    [key: string]: number | null;
}

export interface quarterlyDataInterface extends annualDataInterface {
    quarter: number;
}

export interface stockInterface {
    name: string;
    financialData: stockFinancialDataInterface | null
}

export enum fetchType {
    FINVIZ = 'finviz', YAHOO = 'yahoo'
}

export const getStocks = async (): Promise<string[]> => {
    try {
        const keys = await client.keys('*');
        return keys.filter(key => !nonStockKeys.includes(key));
    } catch (error) {
        return [] as string[];
    }
}

export const getStock = async (stockName: string): Promise<stockInterface | null> => {
    try {
        const rawStock = await client.get(stockName);
        if (rawStock === null) return null;

        const stockObject: stockInterface = JSON.parse(rawStock);

        return stockObject;
    } catch (error) {
        console.log(`Error while getting stock ${stockName}: ${error}`);
        return null;
    }
}

export const saveStock = async (stock: stockInterface): Promise<stockInterface | null> => {
    if (stock.name === undefined || stock.name === '') return null;

    try {
        await client.set(stock.name, JSON.stringify(stock));
        return stock;
    } catch (error) {
        console.log(`Error while saving stock ${stock.name}: ${error}`);
        return null;
    }
}

export const saveUpdateTime = async (fetchType: fetchType, updateTime: number): Promise<Boolean> => {
    try {
        await client.set(`${fetchType}_last`, JSON.stringify(updateTime));
        return true;
    } catch (error) {
        console.log(`Error while saving update time for ${fetchType}: ${error}`);
        return false;
    }
}