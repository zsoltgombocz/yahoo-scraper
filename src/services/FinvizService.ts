import { load } from "cheerio";
import { logger } from "../utils/logger";
import { sleep } from "../utils/sleep";
import { scraperStatus } from "../types";
import Service from "./Service";

interface FinvizServiceInterface {
    finvizBaseUrl: string | undefined;
    finvizExcludeUrl: string | undefined;
    scrapePage: (pageUrl: string) => Promise<{ lastPage: number, stocks: finvizStock[] }>;
    scrape: (url: string) => Promise<finvizStock[]>;
    getFinvizData: () => Promise<finvizStock[]>;
}

export type finvizStock = {
    name: string;
    sector: string;
    country: string;
}

export default class FinvizService extends Service implements FinvizServiceInterface {
    static readonly signature: string = "finviz";

    finvizBaseUrl: string | undefined;
    finvizExcludeUrl: string | undefined;
    allPages: number = 1; //? Assume that initially we know that 1 page can be srraped
    totalCount: number = 20; //? Assume that initially we know that 1 contains 20 stock (this is the max per page)

    constructor(finvizBaseUrl: string | undefined, finvizExcludeUrl: string | undefined) {
        super(FinvizService.signature);

        if (finvizBaseUrl === undefined || finvizExcludeUrl === undefined) {
            logger.error(`SERVICE[${this.signature}]: Wrong constructor parameters provided, returning null.`);
        }

        this.finvizBaseUrl = finvizBaseUrl;
        this.finvizExcludeUrl = finvizExcludeUrl;
    }

    create = async () => {
        const lastUpdate = await this.getLastUpdate();
        if (lastUpdate === 0) {
            this.setStatus(scraperStatus.HALTED);
        }

        await this.loadServiceState();
        return this;
    }

    scrapePage = async (pageUrl: string): Promise<{ lastPage: number, stocks: finvizStock[] }> => {
        let stocks: finvizStock[] = [];
        let lastPage: number = 1;

        try {
            const page = await fetch(pageUrl);
            const body = await page.text();
            const $ = load(body);
            const rows = $("#screener-table tbody tbody tr");

            rows.each((_, tr) => {
                const name = $(tr).find('td:nth-child(2)');
                const sector = $(tr).find('td:nth-child(4)');
                const country = $(tr).find('td:nth-child(6)');

                stocks.push({
                    name: name.text(),
                    sector: sector.text(),
                    country: country.text(),
                } as finvizStock);
            });
            const lastPageElement = $('.screener_pagination > .screener-pages:not(.is-next)').last();
            lastPage = parseInt(lastPageElement.text(), 10) || 1;
        } catch (error) {
            logger.error(`SERVICE[${this.signature}]: Error while scraping page. Message: ${error}`);
        }

        return {
            stocks: stocks,
            lastPage
        };
    }

    scrape = (url: string): Promise<finvizStock[]> => {
        let currentCount = 1;

        let allStocks: finvizStock[] = [];

        return new Promise(async (resolve) => {
            //? After scraping the firs page we can save the last page number
            const { lastPage, stocks } = await this.scrapePage(`${url}&r=1`);
            this.totalCount = 20 * lastPage;
            allStocks = [...stocks];

            while (currentCount <= this.totalCount - 20) {
                currentCount = currentCount + 20;
                const { stocks } = await this.scrapePage(`${url}&r=${currentCount}`);

                allStocks = allStocks.concat(stocks);

                logger.info(`SERVICE[${this.signature}]: Scraped so far ${allStocks.length}.`);

                await sleep(1000);
            }

            resolve(allStocks);
        });
    }

    //? We have to scrape twice to filter out stocks that are can be found in the exlude url
    getFinvizData = async (): Promise<finvizStock[]> => {
        this.setStatus(scraperStatus.PENDING);
        if (this.finvizBaseUrl === undefined || this.finvizExcludeUrl === undefined) {
            this.setStatus(scraperStatus.ERROR);
            return [];
        }

        const scrapedStocks = await this.scrape(this.finvizBaseUrl);
        const excludeStocks = await this.scrape(this.finvizExcludeUrl);
        const exludeStocksNames = excludeStocks.map(stock => stock.name);

        const filteredStocks = scrapedStocks.filter(stock => !exludeStocksNames.includes(stock.name));
        this.setStatus(scraperStatus.FINISHED);

        return filteredStocks;
    }

} 