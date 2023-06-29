import { load } from "cheerio";
import { STATE, globalState } from "./state";
import { client } from './db';

interface screenerPageInterface {
    stocks: string[];
    lastPage: number;
}

const sleep = async (time: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, time));
}

const scrapePage = async (pageUrl: string): Promise<screenerPageInterface> => {
    let stockNames: string[] = [];
    let lastPage: number = 0;

    try {
        const page = await fetch(pageUrl);
        const body = await page.text();
        const $ = load(body);

        const stockNameElements = $("a.screener-link-primary");
        stockNameElements.each((i, div) => {
            stockNames.push($(div).text());
        });

        const lastPageElement = $('.screener_pagination > .screener-pages').last();
        lastPage = parseInt(lastPageElement.text(), 10) || 0;
    } catch (error) {
        console.log('Error fetching page', error);
    }

    return {
        stocks: stockNames,
        lastPage
    };
}

const getAllStocks = (baseURL: string | undefined): Promise<string[]> => {
    let currentCount = 1;

    let allStocks: string[] = [];

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
        const financialStocks = await getAllStocks(process.env.FINVIZ_EXCLUDE_URL);

        const filteredStocks = allStocks.filter(stock => !financialStocks.includes(stock));

        filteredStocks.forEach(async stock => {
            await client.set(stock, JSON.stringify({}));
        });

        await client.set('finviz_last', Date.now().toString());
        globalState.setStocksState(STATE.DONE);
    } catch (error) {
        console.log(error);
        globalState.setStocksState(STATE.ERROR);
    }
} 