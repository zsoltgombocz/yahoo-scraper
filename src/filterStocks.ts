import { addStockToList, annualDataInterface, fetchType, getStock, getStockNames, getStocks, listType, quarterlyDataInterface, saveStock, saveUpdateTime, stockInterface } from "./db"
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
        await saveStock({ ...stock, eligible: { annual: annualPass, quarterly: quarterlyPass } });
    } catch (error) {
        console.log('Error while checking stock financial:', error);
    }
}

export const checkStocks = async () => {
    globalState.setEligibleState(STATE.DOING);
    let stocksWithData: stockInterface[] = [];
    try {
        const stocks = await getStockNames();

        for (let stock of stocks) {
            const stockData: stockInterface | null = await getStock(stock);
            if (stockData === null) continue;

            stocksWithData.push(stockData);
            await isEligible(stockData);
            if (stockData.name === 'GNTX')
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