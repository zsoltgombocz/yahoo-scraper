import { addStockToList, annualDataInterface, fetchType, getStock, getStocks, incomeDatainterface, listType, quarterlyDataInterface, saveIncomePercentage, saveUpdateTime, stockInterface, updateStock } from "./db"
import { STATE, globalState } from "./state";
import { logger } from "./utils/logger";

const checkFinancials = (
    totalAssets: number | null, totalLiabilities: number | null, totalEquity: number | null
): boolean => {
    if (totalAssets === null || totalLiabilities === null || totalEquity === null) return false;

    return (totalLiabilities * 1.5) < totalAssets && (totalEquity * 2.5) > totalLiabilities;
}

//Annaul or quarterly based eligibility
export const isEligible = async (stock: stockInterface): Promise<boolean | undefined> => {
    try {
        if (stock.financialData === null) return undefined;

        const annual: annualDataInterface[] = stock.financialData.annual;
        const quarterly: quarterlyDataInterface[] = stock.financialData.quarterly;

        if (quarterly.length === 0 || annual.length === 0) return undefined;

        const annualPass = annual.every(
            (data: annualDataInterface) => checkFinancials(data.totalAssets, data.totalLiabilities, data.totalEquity)
        );

        const quarterlyPass = checkFinancials(quarterly[0].totalAssets, quarterly[0].totalLiabilities, quarterly[0].totalEquity);
        await updateStock(stock.name, { ...stock, eligible: { annual: annualPass, quarterly: quarterlyPass } });

        return true;
    } catch (error) {
        console.log(`Error while checking stock ${stock.name} financial:`, error);
        return undefined;
    }
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
}

function hasAtLeastTwoNegativeNumbers(numbers: number[]): boolean {
    let negativeCount = 0;

    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] < 0) {
            negativeCount++;

            if (negativeCount >= 2) {
                return true;
            }
        }
    }

    return false;
}

export const getIncomePercentage = (stock: stockInterface): { percentage: number | null, percentages: number[] } => {

    if (stock.incomeData === undefined || stock.incomeData.length === 0) return { percentage: null, percentages: [] };


    const percentages: number[] = stock.incomeData.map(
        (incomeData: incomeDatainterface) => {
            if (incomeData.NICS === null || incomeData.totalRevenue === null) return null;

            return (incomeData.NICS / incomeData.totalRevenue) * 100
        }
    ).filter(notEmpty);

    const hasMoreThanTwoMinuses = hasAtLeastTwoNegativeNumbers(percentages);

    if (hasMoreThanTwoMinuses) return { percentage: null, percentages: percentages };

    const percAvg: number = percentages.reduce(
        (accumulator: number, percentage: number | null) => accumulator + (percentage || 0),
        0
    );

    return {
        percentage: percAvg / percentages.filter(perc => perc !== null).length,
        percentages
    };
}

export const checkStocks = async (): Promise<void | string> => {
    return new Promise(async (resolve) => {
        globalState.setEligibleState(STATE.DOING);
        try {
            const stocks = await getStocks();

            for (let stock of stocks) {
                if (stock === null) continue;

                const eligible = await isEligible(stock);

                if (eligible === undefined) continue;

                const percData = await getIncomePercentage(stock);
                await updateStock(stock.name, {
                    incomePercent: percData.percentage,
                    incomePercentages: percData.percentages
                });

                logger.info(`Eligibility checked on stock: ${stock.name}. [${stocks.indexOf(stock) + 1}/${stocks.length}]`);

                await sortStock(stock);
            }

            await saveUpdateTime(fetchType.ELIGIBLE, Date.now());
            globalState.setEligibleState(STATE.DONE);
            resolve('Stocks checked.')
        } catch (error) {
            console.log('Error while checking financials:', error);
            globalState.setEligibleState(STATE.ERROR);
        }
    });
}

const sortStock = async (stock: stockInterface) => {
    try {
        const listTypes = getTypesBasedOnEligibility(stock.eligible.annual, stock.eligible.quarterly);

        await addStockToList(stock.name, listTypes);
    } catch (error) {
        console.log('Error while sorting stock:', error);
    }
}

export const getTypesBasedOnEligibility = (annual: boolean | null, quarterly: boolean | null): listType[] => {
    let types: listType[] = [];

    if (annual === null || quarterly === null) return types;

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