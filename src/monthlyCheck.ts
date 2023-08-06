import { getStockNames } from "./db";
import { checkStocks } from "./filterStocks";
import { saveFinancialData } from "./scrapeFinance";
import { saveFilteredStocks } from "./scrapeStocks";
import { logger } from "./utils/logger";

export const runMonthlyCheck = (): Promise<string> => {
    return new Promise(async () => {
        try {
            const prevStockAmount = (await getStockNames()).length;
            await saveFilteredStocks();
            const stockAmount = (await getStockNames()).length;
            logger.info(`Finished stock updating. Previous: ${prevStockAmount}, now: ${stockAmount}`);

            await saveFinancialData();
            logger.info(`Finished updateing financials.`);

            await checkStocks();
            logger.info(`Finished checking stocks.`);
        } catch (error: any) {
            throw Error(error);
        }
    });
}