import { registerCustomQueryHandler } from "puppeteer";
import { client } from "./redis/client";
import { listType } from "./types";
import { logger } from "./utils/logger";
import { hasAtLeastTwoNegativeNumbers, notEmpty } from "./utils/arrayHelpers";

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
    updateEligibility: () => void;
}

export interface FinancialInterface {
    balance?: {
        annual: BalanceInterface[],
        quarterly: BalanceInterface[],
    };
    income?: IncomeInterface[];
    marketCap?: number;
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
    income?: {
        avgPercentage: number | null;
        annualPercentages: number[];
    },
    financial?: {
        eligible: {
            annual: boolean | undefined;
            quarterly: boolean | undefined;
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

    load = async (): Promise<Stock> => {
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

    setFinancials = (financials: Partial<FinancialInterface>): void => {
        this.financials = financials;
    }

    updateEligibility = (): void => {
        if (!this.financials?.balance) return;

        const annual = this.financials.balance.annual;
        const quarterly = this.financials.balance.quarterly;

        if (quarterly.length === 0 || annual.length === 0) return undefined;

        const annualPass = annual.every(
            (data: BalanceInterface) => this.checkFinancials(data.totalAssets, data.totalLiabilities, data.totalEquity)
        );

        const quarterlyPass = this.checkFinancials(quarterly[0].totalAssets, quarterly[0].totalLiabilities, quarterly[0].totalEquity);

        this.computed = {
            ...this.computed,
            financial: {
                eligible: {
                    annual: annualPass,
                    quarterly: quarterlyPass
                }
            }
        };

        logger.info(`STOCK[${this.name}]: Updated computed financials (financial). Computed: ${JSON.stringify(this.computed)}`);
    }

    checkFinancials = (
        totalAssets: number | undefined, totalLiabilities: number | undefined, totalEquity: number | undefined
    ): boolean | undefined => {
        if (totalAssets === undefined || totalLiabilities === undefined || totalEquity === undefined) return undefined;

        return (totalLiabilities * 1.5) < totalAssets && (totalEquity * 2.5) > totalLiabilities;
    }

    updateIncomePercentage = (): void => {

        if (!this.financials || !this.financials?.income) return;

        const percentages: number[] = this.financials.income.map(
            (incomeData: IncomeInterface) => {
                if (incomeData.NICS === undefined || incomeData.totalRevenue === undefined) return null;
                if (incomeData.totalRevenue === 0) return null;

                return (incomeData.NICS / incomeData.totalRevenue) * 100
            }
        ).filter(notEmpty);

        const hasMoreThanTwoMinuses = hasAtLeastTwoNegativeNumbers(percentages);

        const percetangeSum: number = percentages.reduce(
            (accumulator: number, percentage: number | null) => accumulator + (percentage || 0),
            0
        );
        const maxPercentage = percentages.reduce((a, b) => Math.max(a, b), -Infinity);
        const percentageAvg = (percetangeSum - maxPercentage) / (percentages.filter(perc => perc !== null).length - 1)

        this.computed = {
            ...this.computed,
            income: {
                annualPercentages: percentages,
                avgPercentage: hasMoreThanTwoMinuses ? null : percentageAvg,
            }
        }

        logger.info(`STOCK[${this.name}]: Updated computed financials (income). Computed: ${JSON.stringify(this.computed)}`);
    }

    sortStock = () => {
        const listTypes = this.getListTypes();
        this.list = listTypes;

        logger.info(`STOCK[${this.name}]: Added to lists: ${JSON.stringify(listTypes)}`);
    }

    getListTypes = (): listType[] => {
        let types: listType[] = [];

        if (!this.computed?.financial || !this.computed.financial.eligible) return types;

        const { annual, quarterly } = this.computed!.financial!.eligible;

        if (annual === true) {
            types.push(listType.ANNUAL_OK);
        }

        if (annual === true && quarterly === true) {
            types.push(listType.ANNUAL_OK_QUARTERLY_OK);
        }

        if (annual === true && quarterly === false) {
            types.push(listType.ANNUAL_OK_QUARTERLY_NO);
        }

        if (quarterly === true) {
            types.push(listType.QUARTERLY_OK);
        } else {
            types.push(listType.QUARTERLY_NO);
        }

        return types;
    }

    hasFourAnnualBalance = (): boolean => {
        return this.financials?.balance?.annual.length === 4;
    }

    hasFourQuarterlyBalance = (): boolean => {
        return this.financials?.balance?.quarterly.length === 4;
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