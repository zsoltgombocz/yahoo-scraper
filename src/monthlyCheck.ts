import { getStockNames } from "./db";
import { checkStocks } from "./filterStocks";
import { generateExcel } from "./generateExcel";
import { saveFinancialData } from "./scrapeFinance";
import { saveFilteredStocks } from "./scrapeStocks";
import { logger } from "./utils/logger";
import { sleep } from "./utils/sleep";

export const runMonthlyCheck = (): Promise<string> => {
    return new Promise(async () => {
        try {
            const prevStockAmount = (await getStockNames()).length;
            await saveFilteredStocks();
            const stockAmount = (await getStockNames()).length;
            logger.info(`Finished stock updating. Previous: ${prevStockAmount}, now: ${stockAmount}`);

            await saveFinancialData();
            logger.info(`Finished updating financials.`);
            await sleep(10000);

            await checkStocks();
            logger.info(`Finished checking stocks.`);

            await generateExcel();
            logger.info(`Generated excel file.`);
        } catch (error: any) {
            throw Error(error);
        }
    });
}