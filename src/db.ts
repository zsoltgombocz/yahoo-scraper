import { createClient, RedisClientType } from 'redis';
import 'dotenv/config';

export let STOCK_LIST: stockInterface[] = [];

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
    totalLiabilities: number | null;
    totalEquity: number | null;
    [key: string]: number | null;
}

export interface quarterlyDataInterface extends annualDataInterface {
    quarter: number;
}

export interface stockInterface {
    name: string;
    financialData: stockFinancialDataInterface | null,
    eligible: {
        annual: boolean | null,
        quarterly: boolean | null,
    },
    list: string[]
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

        if (STOCK_LIST.length > 0) {
            return STOCK_LIST;
        } else {
            for (let stock of stocks) {
                const stockData = await getStock(stock);

                if (stockData !== null) {
                    stockList.push(stockData);
                }

            }
            STOCK_LIST = stockList;
            return stockList;
        }
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

export const addStockToList = async (stockName: string, type: listType[]): Promise<void> => {
    try {
        let stock: stockInterface | null = await getStock(stockName);
        if (stock === null) return console.log(`Adding stock to list error, stock ${stockName} not found!`);

        stock.list = type;

        await client.set(stockName, JSON.stringify(stock));
    } catch (error) {
        console.log(`Error while adding list ${type} to ${stockName}: ${error}`);
    }
}

export const getStocksFromList = async (listName: string): Promise<string[]> => {
    try {
        let stocks: stockInterface[] = await getStocks();
        const filteredStocks = stocks.filter(stock => stock.list?.includes(listName));

        return filteredStocks.map(stock => stock.name);
    } catch (error) {
        console.log(`Error while getting list ${listName}: ${error}`);
        return [];
    }
}

//When getting all stocks from Redis exclude these
export const nonStockKeys = [
    'finviz_last',
    'yahoo_last',
    'eligible_last',
    ...Object.values(listType),
];