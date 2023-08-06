import { createClient, RedisClientType } from 'redis';
import 'dotenv/config';
import { logger } from './utils/logger';

export let STOCK_LIST: stockInterface[] = [];

export const client: RedisClientType = createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`

});

client.on('error', err => logger.error('REDIS: ', err.message));

client.on('connect', () => {
    logger.info('REDIS: Connected to Redis!');
});
export interface stockFinancialDataInterface {
    annual: annualDataInterface[],
    quarterly: quarterlyDataInterface[],
}

export interface annualDataInterface {
    year: number;
    totalAssets: number | null;
    totalLiabilities: number | null;
    totalEquity: number | null;
    [key: string]: number | null;
}

export interface quarterlyDataInterface extends annualDataInterface {
    quarter: number;
}

export interface incomeDatainterface {
    year: number;
    totalRevenue: number | null;
    NICS: number | null;
    [key: string]: number | null;
}

export interface stockInterface {
    name: string;
    sector?: string,
    financialData: stockFinancialDataInterface | null,
    eligible: {
        annual: boolean | null,
        quarterly: boolean | null,
    },
    list: string[],
    incomeData: incomeDatainterface[],
    incomePercent: number | null,
    incomePercentages?: number[]

}

export enum listType {
    ANNUAL_OK = 'annual_ok', ANNUAL_OK_QUARTERLY_OK = 'annual_ok_quarterly_ok',
    ANNUAL_OK_QUARTERLY_NO = 'annual_ok_quarterly_no', QUARTERLY_OK = 'quarterly_ok',
    QUARTERLY_NO = 'quarterly_no',
}

export enum fetchType {
    FINVIZ = 'finviz', YAHOO = 'yahoo', ELIGIBLE = 'eligible'
}

export const getStockNames = async (): Promise<string[]> => {
    try {
        const keys = await client.keys('*');
        const stocks: string[] = keys.filter(key => !nonStockKeys.includes(key));

        return stocks;
    } catch (error) {
        return [] as string[];
    }
}

export const getStocks = async (): Promise<stockInterface[]> => {
    try {
        const stocks: string[] = await getStockNames();
        const stockList: stockInterface[] = [];

        console.log('Getting stock... takes 300 sec');
        for (let stock of stocks) {
            const stockData = await getStock(stock);

            if (stockData !== null) {
                stockList.push(stockData);
            }

        }

        return stockList;
    } catch (error) {
        console.log('Error while getting stock list: ', error);
        return [] as stockInterface[];
    }
}

export const getStock = async (stockName: string): Promise<stockInterface | null> => {
    try {
        const rawStock = await client.get(stockName);
        if (rawStock === null || rawStock === '{}') return null;

        const stockObject: stockInterface = JSON.parse(rawStock);

        return stockObject;
    } catch (error) {
        console.log(`Error while getting stock ${stockName}: ${error}`);
        return null;
    }
}

const saveStock = async (stock: stockInterface): Promise<void> => {
    try {
        await client.set(stock.name, JSON.stringify(stock));
    } catch (error) {
        console.log(`Error while saving stock ${stock.name}: ${error}`);
    }
}

export const updateStock = async (name: string, data: Partial<stockInterface>): Promise<stockInterface | null> => {
    if (name === undefined || name === '') return null;

    try {
        const exist = await getStock(name);

        if (exist === null) {
            const newStock = {
                name: name,
                financialData: null,
                eligible: {
                    annual: null,
                    quarterly: null,
                },
                list: [],
                incomeData: [],
                incomePercent: null,
            };

            await saveStock(newStock);
            return newStock;
        } else {
            const updated: stockInterface = {
                ...exist,
                ...data
            }

            await saveStock(updated);
            return updated;
        }
    } catch (error) {
        console.log(`Error while updating stock ${name}: ${error}`);
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

export const addStockToList = async (stockName: string, type: listType[]): Promise<void> => {
    try {
        let stock: stockInterface | null = await getStock(stockName);
        if (stock === null) return console.log(`Adding stock to list error, stock ${stockName} not found!`);

        stock.list = type;

        await client.set(stockName, JSON.stringify(stock));

        console.log(`Stock ${stockName} added to list ${type}!`);
    } catch (error) {
        console.log(`Error while adding list ${type} to ${stockName}: ${error}`);
    }
}

export const getStocksFromList = async (listName: string): Promise<stockInterface[]> => {
    try {
        let stocks: stockInterface[] = await getStocks();
        const filteredStocks = stocks.filter(stock => stock.list?.includes(listName));

        return filteredStocks;
    } catch (error) {
        console.log(`Error while getting list ${listName}: ${error}`);
        return [];
    }
}

export const saveIncomePercentage = async (stockName: string, percentage: number | null): Promise<void> => {
    try {
        let stock: stockInterface | null = await getStock(stockName);
        if (stock === null) return console.log(`Saving percentage error, stock ${stockName} not found!`);

        await updateStock(stockName, { incomePercent: percentage });

        console.log(`Stock ${stockName} updated with income percentage ${percentage}!`);
    } catch (error) {
        console.log(`Error while updating stock ${stockName} with percentage: ${error}`);
    }
}

//When getting all stocks from Redis exclude these
export const nonStockKeys = [
    'finviz_last',
    'yahoo_last',
    'eligible_last',
    ...Object.values(listType),
];