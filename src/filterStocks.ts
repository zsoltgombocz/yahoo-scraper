import { addStockToList, annualDataInterface, fetchType, getStock, getStocks, listType, quarterlyDataInterface, saveStock, saveUpdateTime, stockInterface } from "./db"
import { STATE, globalState } from "./state";

const checkFinancials = (
    totalDebt: number | null, totalAssets: number | null, netTangibleAssets: number | null
): boolean => {
    if (totalDebt === null || totalAssets === null || netTangibleAssets === null) return false;

    return (totalDebt * 1.5) < totalAssets && (netTangibleAssets * 2) > totalDebt;
}

//Annaul or quarterly based eligibility
export const isEligible = async (stock: stockInterface): Promise<boolean | undefined> => {
    try {
        if (stock.financialData === null) return undefined;
        const annual: annualDataInterface[] = stock.financialData.annual;
        const quarterly: quarterlyDataInterface[] = stock.financialData.quarterly;

        const annualPass = annual.every(
            (data: annualDataInterface) => checkFinancials(data.totalDebt, data.totalAssets, data.netTangibleAssets)
        );

        const quarterlyPass = checkFinancials(quarterly[0].totalDebt, quarterly[0].totalAssets, quarterly[0].netTangibleAssets);
        await saveStock({ ...stock, eligible: { annual: annualPass, quarterly: quarterlyPass } });
    } catch (error) {
        console.log('Error while checking stock financial:', error);
    }
}

export const checkStocks = async () => {
    globalState.setEligibleState(STATE.DOING);
    let stocksWithData: stockInterface[] = [];
    try {
        const stocks = await getStocks();

        for (let stock of stocks) {
            const stockData: stockInterface | null = await getStock(stock);
            if (stockData === null) continue;

            stocksWithData.push(stockData);
            await isEligible(stockData);
            console.log(`Eligibility checked on stock: ${stock}. [${stocks.indexOf(stock)}/${stocks.length}]`);

            await sortStock(stockData);
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
        const listTypes = getTypesBasedOnEligibility(stock.eligible.annual, stock.eligible.quarterly);

        for (let type of listTypes) {
            await addStockToList(stock.name, type);
            console.log(`Stock ${stock.name} added to list: ${type}.`);
        }
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