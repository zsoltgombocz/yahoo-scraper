import moment from "moment";
import Stock from "./Stock";
import FinvizService, { finvizStock } from "./services/FinvizService";
import YahooService from "./services/YahooService";
import { scraperStatus } from "./types";
import { client, nonStockKeys } from "./redis/client";
import { logger } from "./utils/logger";
import { BROWSER } from "./browser";

export interface FetcherInterface {
    finvizService: FinvizService;
    yahooService: YahooService;
}

export default class Fetcher implements FetcherInterface {
    finvizService: FinvizService;
    yahooService: YahooService;

    constructor(finvizService: FinvizService, yahooService: YahooService) {
        this.finvizService = finvizService;
        this.yahooService = yahooService;
    }



    saveFinvizStocks = async () => {
        const lastUpdate = await this.finvizService.getLastUpdate();
        const diff = moment.unix(lastUpdate / 1000 || 0).add(1, 'days').diff(moment.now(), 'hours');

        if ((diff < 1 || lastUpdate === 0) ||
            (diff > 1 && this.finvizService.getStatus() !== scraperStatus.FINISHED)
        ) {
            const scrapedStocks: finvizStock[] = await this.finvizService.getFinvizData();
            for (let i = 0; i < scrapedStocks.length; i++) {
                await new Stock(
                    scrapedStocks[i].name,
                    scrapedStocks[i].country,
                    scrapedStocks[i].sector
                ).save();
            }
        }
    }

    updateStocks = async () => {
        const lastUpdate = await this.finvizService.getLastUpdate();
        const diff = moment.unix(lastUpdate / 1000 || 0).add(1, 'days').diff(moment.now(), 'hours');

        if ((diff < 1 || lastUpdate === 0) ||
            (diff > 1 && this.yahooService.getStatus() !== scraperStatus.FINISHED)
        ) {
            const allKeys = await client.keys('*');
            if (allKeys === null) return;

            const stocks = allKeys.filter(key => !nonStockKeys.includes(key));

            for (let stockKey of stocks) {
                const stock = await new Stock(stockKey).load();
                const financialData = await this.yahooService.getFinancialData(stockKey);

                if (financialData === null) {
                    logger.info(`[FETCHER]: Got null as financial data for ${stockKey}`);
                    continue;
                }

                stock.setFinancials(financialData);
                await stock.save();
            }

            BROWSER?.close();
        }
    }
}