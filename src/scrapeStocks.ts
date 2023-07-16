import { load } from "cheerio";
import { STATE, globalState } from "./state";
import { fetchType, saveUpdateTime, updateStock } from './db';

interface scrapedStockInterface {
    name: string;
    sector: string;
}
interface screenerPageInterface {
    stocks: scrapedStockInterface[];
    lastPage: number;
}

const sleep = async (time: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, time));
}

const scrapePage = async (pageUrl: string): Promise<screenerPageInterface> => {
    let stocks: scrapedStockInterface[] = [];
    let lastPage: number = 0;

    try {
        const page = await fetch(pageUrl);
        const body = await page.text();
        const $ = load(body);

        const rows = $("#screener-views-table tr:nth-child(5) table tr:not(first-child)");

        rows.each((_, div) => {
            const stockName = $(div).find('td:nth-child(2)');
            const stockSector = $(div).find('td:nth-child(4)');
            stocks.push({
                name: stockName.text(),
                sector: stockSector.text(),
            })
        });

        const lastPageElement = $('.screener_pagination > .screener-pages').last();
        lastPage = parseInt(lastPageElement.text(), 10) || 0;
    } catch (error) {
        console.log('Error fetching page', error);
    }

    return {
        stocks: stocks,
        lastPage
    };
}

const getAllStocks = (baseURL: string | undefined): Promise<scrapedStockInterface[]> => {
    let currentCount = 1;

    let allStocks: scrapedStockInterface[] = [];

    return new Promise(async (resolve, reject) => {
        if (baseURL === undefined) reject([]);

        const firstPage: screenerPageInterface = await scrapePage(`${baseURL}&r=1`);
        const lastCount = 20 * firstPage.lastPage;
        allStocks = [...firstPage.stocks];

        while (currentCount <= lastCount - 20) {
            currentCount = currentCount + 20;
            const page: screenerPageInterface = await scrapePage(`${baseURL}&r=${currentCount}`);
            allStocks = allStocks.concat(page.stocks);
            console.log(`Scraped so far ${currentCount} and counting...`);
            await sleep(1000);
        }

        resolve(allStocks);
    });
}

export const saveFilteredStocks = async (): Promise<void> => {
    globalState.setStocksState(STATE.DOING);

    try {
        const allStocks = await getAllStocks(process.env.FINVIZ_BASE_URL);
        let financialStocks: string[] = [];

        getAllStocks(process.env.FINVIZ_EXCLUDE_URL).then(stocks => {
            financialStocks = stocks.map(stocks => stocks.name);
        });

        const filteredStocks = allStocks.filter(stock => !financialStocks.includes(stock.name));

        filteredStocks.forEach(async stock => {
            await updateStock(stock.name, {
                sector: stock.sector,
            });
        });

        await saveUpdateTime(fetchType.FINVIZ, Date.now());

        globalState.setStocksState(STATE.DONE);
    } catch (error) {
        console.log('Error while saving stocks from finviz:', error);
        globalState.setStocksState(STATE.ERROR);
    }
} 