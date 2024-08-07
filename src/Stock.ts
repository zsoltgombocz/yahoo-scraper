import { listType } from "./types";
import { hasAtLeastTwoNegativeNumbers, notEmpty } from "./utils/arrayHelpers";

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

export default class Stock {
    static getEligibility = (financialData: FinancialInterface): Partial<ComputedInterface> | null => {
        if (!financialData?.balance) return null;

        const annual = financialData.balance.annual;
        const quarterly = financialData.balance.quarterly;

        if (quarterly.length === 0 || annual.length === 0) return null;

        const annualPass = annual.every(
            (data: BalanceInterface) => Stock.checkFinancials(data.totalAssets, data.totalLiabilities, data.totalEquity)
        );

        const quarterlyPass = Stock.checkFinancials(quarterly[0].totalAssets, quarterly[0].totalLiabilities, quarterly[0].totalEquity);
        
        return {
            financial: {
                eligible: {
                    annual: annualPass,
                    quarterly: quarterlyPass
                }
            }
        };
    }

    static checkFinancials = (
        totalAssets: number | undefined, totalLiabilities: number | undefined, totalEquity: number | undefined
    ): boolean | undefined => {
        if (totalAssets === undefined || totalLiabilities === undefined || totalEquity === undefined) return undefined;

        return (totalLiabilities * 1.5) < totalAssets && (totalEquity * 2.5) > totalLiabilities;
    }

    static getIncomePercentage = (financialData: FinancialInterface): Partial<ComputedInterface> | null => {
        if (!financialData || !financialData?.income || financialData.income.length < 2) return null;

        const percentages: number[] = financialData.income.map(
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
        const percentageAvg = (percetangeSum - maxPercentage) / (percentages.length);

        return {
            income: {
                annualPercentages: percentages,
                avgPercentage: hasMoreThanTwoMinuses || percentageAvg === 0 || percentages.length < 2 ? null : percentageAvg,
            }
        }
    }

    static getListTypes = (financialEligibility: Partial<ComputedInterface>): listType[] => {
        let types: listType[] = [];

        if (!financialEligibility || !financialEligibility.financial?.eligible) return types;

        const { annual, quarterly } = financialEligibility.financial?.eligible;

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

    static hasFourAnnualBalance = (stock: any): boolean => {
        return stock.financials?.balance?.annual.length >= 4;
    }

    static hasFourQuarterlyBalance = (stock: any): boolean => {
        return stock.financials?.balance?.quarterly.length >= 4;
    }
}