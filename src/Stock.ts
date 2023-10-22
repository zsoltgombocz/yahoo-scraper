import { client } from "./redis/client";
import { listType } from "./types";
import { logger } from "./utils/logger";

export interface StockInterface {
    name: string;
    country: string | null;
    sector: string | null;
    financials: FinancialInterface | null;
    computed: ComputedInterface | null;
    list: listType[]; //? Based on balance (annual and\or quarterly) store lists,
    timestamp?: number;
    loaded: boolean;
    exists: boolean;

    save: () => void;
    setFinancials: (financials: Partial<FinancialInterface>) => void;
}

export interface FinancialInterface {
    balance?: {
        annual: BalanceInterface[],
        quarterly: BalanceInterface[],
    };
    income?: IncomeInterface[];
}

export interface BalanceInterface {
    year: number;
    quarter?: number | undefined;
    totalAssets?: number | undefined;
    totalLiabilities?: number | undefined;
    totalEquity?: number | undefined;
    [key: string]: number | undefined;
}

export interface IncomeInterface {
    year: number;
    totalRevenue?: number | undefined;
    NICS?: number | undefined; //! Net Income Common Stockholders
    [key: string]: number | undefined;
}

//? Computed fields which calculcated from the scraped data (income, financial)
//? These values computed with very specific calculations 
export interface ComputedInterface {
    income: {
        avgPercentage: number | null;
        annualPercentages: number[];
    },
    financial: {
        eligible: {
            annual: boolean | null;
            querterly: boolean | null;
        }
    }
}

export default class Stock implements StockInterface {
    name: string;
    country: string | null;
    sector: string | null;
    list: listType[];
    financials: FinancialInterface | null;
    computed: ComputedInterface | null;
    timestamp?: number;
    loaded: boolean;
    exists: boolean;

    constructor(name: string, country?: string, sector?: string) {
        this.name = name;
        this.country = country || null;
        this.sector = sector || null;
        this.list = [];
        this.financials = null;
        this.computed = null;
        this.loaded = false;
        this.exists = false;
    }

    save = async (): Promise<void> => {
        this.timestamp = new Date().getTime();
        await client.set(this.name, JSON.stringify(this));

        logger.info(`STOCK[${this.name}]: Saved!`)
    }

    load = async (): Promise<StockInterface> => {
        const rawData: string | null = await client.get(this.name);

        if (rawData === null) return this;

        try {
            const data: StockInterface = JSON.parse(rawData);
            this.#set(data);
            this.loaded = true;
            this.exists = true;

            return this;
        } catch (error) {
            logger.error(`STOCK[${this.name}]: Unable to parse loaded data.`);
            return this;
        }
    }

    setFinancials = (financials: Partial<FinancialInterface>) => {
        this.financials = financials;
    }

    #set = (data: Partial<StockInterface>) => {
        this.country = data.country || null;
        this.sector = data.sector || null;
        this.list = data.list || [];
        this.financials = data.financials || null;
        this.computed = data.computed || null;
        this.timestamp = data.timestamp || this.timestamp;
    }
}