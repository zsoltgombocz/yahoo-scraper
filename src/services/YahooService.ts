import { load } from "cheerio";
import { logger } from "../utils/logger";
import { sleep } from "../utils/sleep";
import { scraperStatus } from "../types";
import Service from "./Service";
import { BalanceInterface, FinancialInterface, IncomeInterface } from "../Stock";
import { Page } from "puppeteer";
import { acceptCookie, getPage } from "../browser";

interface YahooServiceInterface {
    yahooFinanceUrl: string | undefined;
}

type rawHTML = {
    annualTableHTML: string;
    quarterlyTableHTML: string;
}

const includeRows = [
    { searchFor: 'Total Assets', saveAs: 'totalAssets' },
    { searchFor: 'Total Liabilities Net Minority Interest', saveAs: 'totalLiabilities' },
    { searchFor: 'Total Equity Gross Minority Interest', saveAs: 'totalEquity' },
    { searchFor: 'Total Revenue', saveAs: 'totalRevenue' },
    { searchFor: 'Net Income Common Stockholders', saveAs: 'NICS' },
];

class YahooService extends Service implements YahooServiceInterface {
    static readonly signature: string = "yahoo";
    yahooFinanceUrl: string | undefined;

    constructor(yahooFinanceUrl: string | undefined) {
        super(YahooService.signature);

        if (yahooFinanceUrl === undefined) {
            logger.error(`SERVICE[${this.signature}]: Wrong constructor parameters provided, returning null.`);
        }

        this.yahooFinanceUrl = yahooFinanceUrl;
    }

    create = async () => {
        const lastUpdate = await this.getLastUpdate();
        if (lastUpdate === 0) {
            this.setStatus(scraperStatus.HALTED);
        }

        await this.loadServiceState();
        return this;
    }

    #getRawHTML = async (stock: string, type: 'financials' | 'balance-sheet' | ''): Promise<rawHTML | null> => {
        let page: Page | undefined;

        try {
            const url = `${this.yahooFinanceUrl}/${stock}/${type}?p=${stock}`;
            page = await getPage(url);

            await acceptCookie(page);

            await page.setViewport({ width: 1080, height: 1024 });

            await page.waitForSelector('div.table');

            const annualHTML: string = await page.$eval('div.table', element => element.innerHTML);

            await page.waitForSelector('#tab-quarterly', { timeout: 5000 });

            await sleep(1500);

            await page.click('#tab-quarterly');

            await sleep(1500);

            const quarterlyHTML: string = await page.$eval('div.table', element => element.innerHTML);

            await page.close();

            return {
                annualTableHTML: annualHTML,
                quarterlyTableHTML: quarterlyHTML,
            }
        } catch (error) {
            await page?.close();
            logger.error(`SERVICE[${this.signature}]: Error while getting ${type} raw HTML: ${error}`);
            return null;
        }
    }

    #parseDataFromHTML = (html: string): { [key: string]: number | undefined }[] => {
        const $ = load(html);

        const tableHeader = $('.tableHeader > div.row > div.column:not(:first-child)');
        const parsedArray: { [key: string]: number | undefined }[] = [];

        tableHeader.each((i, div) => {
            const quarterRaw = parseInt($(div).text().split('/')[0]);
            const headerText = $(div).text();

            let parsedData: { [key: string]: number | undefined } = {
                year: headerText === 'TTM' ? 0 : parseInt(headerText.split('/')[2]),
                quarter: quarterRaw < 3 || isNaN(quarterRaw) ? 1 : Math.ceil(quarterRaw / 3),
            };

            includeRows.map(includeRow => {
                const row = $(`div.column:contains("${includeRow.searchFor}")`).parent();
                if (row.html() !== null) {
                    const value: string = $(row).find(`div.column:nth-child(${i + 2})`).text();
                    let saveValue: number | undefined = value === '-' ? undefined : parseInt(value.replaceAll(',', ''));
                    const saveAs = includeRow.saveAs;
                    parsedData[saveAs] = saveValue;
                }
            })

            parsedArray.push(parsedData);
        });

        return parsedArray;
    }

    #getMarketCap = async (stock: string): Promise<number | undefined> => {
        try {
            let page: Page | undefined;

            const url = `${this.yahooFinanceUrl}/${stock}/?p=${stock}`;
            page = await getPage(url);

            await acceptCookie(page);

            await page.setViewport({ width: 1080, height: 1024 });

            await page.waitForSelector('fin-streamer[data-field="marketCap"]');

            const marketCapText = await page.$eval('fin-streamer[data-field="marketCap"]', element => element.innerHTML);

            await page.close();

            if (marketCapText?.includes('M')) {
                return Math.round(parseFloat(marketCapText.slice(0, -1)));
            } else if (marketCapText?.includes('B')) {
                return Math.round(parseFloat(marketCapText.slice(0, -1))) * 1_000;
            } else {
                return Math.round(parseFloat(marketCapText.slice(0, -1))) * 1_000_000;
            }
        } catch (error) {
            logger.error(`SERVICE[${this.signature}]: Error while getting market cap: ${error}`);
            return undefined;
        }

    }

    #getIncomeData = async (stock: string): Promise<IncomeInterface[]> => {
        let incomeData: IncomeInterface[] = [];

        try {
            const html = await this.#getRawHTML(stock, 'financials');
            if (html === null) return incomeData;

            const parsedData = this.#parseDataFromHTML(html.annualTableHTML);

            return parsedData as IncomeInterface[];
        } catch (error) {
            logger.error(`SERVICE[${this.signature}]: Error while parsing income data from HTML: ${error}`);
        }

        return incomeData;
    }

    #getBalanceData = async (stock: string): Promise<{ annual: BalanceInterface[], quarterly: BalanceInterface[] }> => {
        try {
            const html = await this.#getRawHTML(stock, 'balance-sheet');
            if (html === null) return {
                annual: [],
                quarterly: [],
            };

            const parsedAnnualData = this.#parseDataFromHTML(html.annualTableHTML);
            const parsedQuarterlyData = this.#parseDataFromHTML(html.quarterlyTableHTML);

            return {
                annual: parsedAnnualData as BalanceInterface[],
                quarterly: parsedQuarterlyData as BalanceInterface[],
            };
        } catch (error) {
            logger.error(`SERVICE[${this.signature}]: Error while parsing income data from HTML: ${error}`);
        }

        return {
            annual: [],
            quarterly: [],
        };
    }

    getFinancialData = async (stock: string): Promise<FinancialInterface | null> => {
        try {
            const marketCap = await this.#getMarketCap(stock);
            const incomeData = await this.#getIncomeData(stock);
            const balanceData = await this.#getBalanceData(stock);

            return {
                income: incomeData,
                balance: balanceData,
                marketCap: marketCap
            } as FinancialInterface;
        } catch (error) {
            logger.error(`SERVICE[${this.signature}]: Error while getting financial data: ${error}`);
            return null;
        }
    }
}

export default YahooService;