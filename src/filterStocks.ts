import { addStockToList, annualDataInterface, fetchType, getStocks, incomeDatainterface, listType, quarterlyDataInterface, saveIncomePercentage, saveUpdateTime, stockInterface, updateStock } from "./db"
import { STATE, globalState } from "./state";

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

        const annualPass = annual.every(
            (data: annualDataInterface) => checkFinancials(data.totalAssets, data.totalLiabilities, data.totalEquity)
        );

        const quarterlyPass = checkFinancials(quarterly[0].totalAssets, quarterly[0].totalLiabilities, quarterly[0].totalEquity);
        await updateStock(stock.name, { ...stock, eligible: { annual: annualPass, quarterly: quarterlyPass } });
    } catch (error) {
        console.log('Error while checking stock financial:', error);
    }
}

export const getIncomePercentage = (stock: stockInterface): number | null => {
    if (stock.incomeData === null || stock.incomeData.length === 0) return null;

    const percentages = stock.incomeData.map(
        (incomeData: incomeDatainterface) => {
            if (incomeData.NICS === null || incomeData.totalRevenue === null) return null;

            return (incomeData.NICS / incomeData.totalRevenue) * 100
        }
    );

    const percAvg: number = percentages.reduce(
        (accumulator: number, percentage: number | null) => accumulator + (percentage || 0),
        0
    );

    return percAvg / percentages.filter(perc => perc !== null).length;
}

export const checkStocks = async () => {
    globalState.setEligibleState(STATE.DOING);
    try {
        const stocks = await getStocks();

        for (let stock of stocks) {
            if (stock === null) continue;

            await isEligible(stock);
            const percentage = await getIncomePercentage(stock);
            await saveIncomePercentage(stock.name, percentage);

            console.log(`Eligibility checked on stock: ${stock.name}. [${stocks.indexOf(stock)}/${stocks.length}]`);

            await sortStock(stock);
        }

        await saveUpdateTime(fetchType.ELIGIBLE, Date.now());
        globalState.setEligibleState(STATE.DONE);
    } catch (error) {
        console.log('Error while checking financials:', error);
        globalState.setEligibleState(STATE.ERROR);
    }
}

const sortStock = async (stock: stockInterface) => {
    try {
        const listTypes = getTypesBasedOnEligibility(stock.eligible.annual, stock.eligible.quarterly, stock.name === 'GNTX');

        await addStockToList(stock.name, listTypes);
    } catch (error) {
        console.log('Error while sorting stock:', error);
    }
}

export const getTypesBasedOnEligibility = (annual: boolean | null, quarterly: boolean | null, log: boolean = false): listType[] => {
    let types: listType[] = [];
    if (log) console.debug(annual, quarterly);


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