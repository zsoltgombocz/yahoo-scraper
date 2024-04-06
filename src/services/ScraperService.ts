import { runQuery } from "../mysql/client";
import ProcessManager from "../processes/ProcessManager";
import { logger } from "../utils/logger";
import { sleep } from "../utils/sleep";
import finvizPageScraper from "./helpers/finvizPageScraper";

interface ScraperServiceInterface {
    finvizUrl: string;
    yahooUrl: string;
    processManager: ProcessManager;

    scrapeStockList(): void
}

class ScraperService implements ScraperServiceInterface {
    finvizUrl: string;
    yahooUrl: string;
    processManager: ProcessManager;

    constructor(finvizUrl: string | undefined, yahooUrl: string | undefined) {
        if(finvizUrl === undefined || yahooUrl === undefined) {
            throw new Error('Provide the URLs in order to use the scraper');
        }

        this.finvizUrl = finvizUrl;
        this.yahooUrl = yahooUrl;
        this.processManager = new ProcessManager();
    }

    async scrapeStockList(): Promise<void> {
        let lastPage = false;
        let page = 1;

        this.processManager.addProcess('finviz-scrape');

        while(!lastPage) {
            const {last, stocks} = await finvizPageScraper(page);
            lastPage = last;

            const values = stocks.reduce(
                (prev, curr) => {
                    return prev += `("${curr.company}", "${curr.name}", "${curr.sector}", "${curr.industry}", "${curr.country}", 0, NOW()),`
                }, ""
            ).slice(0, -1);

            const query = `
                INSERT INTO stocks
                    ( company_name, stock_name, sector, industry, country, market_cap, updated_at )
                VALUES ${values}
                ON DUPLICATE KEY UPDATE
                    company_name = VALUES(company_name),
                    sector = VALUES (stock_name),
                    industry = VALUES (industry),
                    country = VALUES (country),
                    market_cap = VALUES (market_cap),
                    updated_at = NOW();
            `;

            runQuery(query)
                .then(result => logger.info(`Finviz scrape saved, page: ${page}, insertId: ${result.insertId}`))
                .catch(error => logger.error(`Finviz scrape error: ${error}`));
            
            await sleep(500);

            page++;
        }

        logger.info('Finviz scrape finished.');
        this.processManager.deleteProcess('finviz-scrape');
    }
}

export default ScraperService;