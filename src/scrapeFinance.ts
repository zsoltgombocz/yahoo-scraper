import { getPage } from './browser';
import { load } from "cheerio";
import { STATE, globalState } from './state';
import { client } from './db';
import { Page } from 'puppeteer';

interface stockFinancialDataInterface {
    annual: annualDataInterface[],
    quarterly: quarterlyDataInterface[],
}

interface annualDataInterface {
    year: number;
    totalAssets: number | null;
    totalDebt: number | null;
    netTangibleAssets: number | null;
    [key: string]: number | null;
}

interface quarterlyDataInterface extends annualDataInterface {
    quarter: number;
}

interface rawHTMLs {
    annual: string | undefined;
    quarterly: string | undefined;
}

const includeRows = [
    { searchFor: 'Total Assets', saveAs: 'totalAssets' },
    { searchFor: 'Net Tangible Assets', saveAs: 'netTangibleAssets' },
    { searchFor: 'Total Debt', saveAs: 'totalDebt' },
];

const getBalanceSheetURL = (stock: string): string => {
    return `${process.env.YAHOO_FINANCE_URL}/${stock}/balance-sheet?p=${stock}`;
}

const acceptCookie = (page: Page) => {
    return new Promise(async (resolve) => {
        page.waitForSelector('.accept-all', {
            timeout: 2000
        })
            .then(() => {
                page.click('.accept-all');
                resolve('Cookie: Accepted.');
            })
            .catch(() => resolve('Cookie: Nothing to accept.'))
            .finally(() => resolve('Cookie: Done.'));
    })
}

const getRawFinancialHTMLs = (stock: string): Promise<rawHTMLs> => {
    const yahooURL = getBalanceSheetURL(stock);

    return new Promise(async (resolve, reject) => {
        let page: Page | undefined;
        try {
            page = await getPage(yahooURL);

            const cookie = await acceptCookie(page);

            await page.setViewport({ width: 1080, height: 1024 });

            await page.waitForSelector('#Main');
            const balanceSheetAnnualHTML: string = await page.$eval('#Main div:nth-child(2) > div', element => element.innerHTML);

            await page.waitForSelector('#Main .IbBox:nth-child(2) > button', { timeout: 5000 });
            await page.click('#Main .IbBox:nth-child(2) > button');

            await page.waitForTimeout(2000);

            const balanceSheetQuarterlyHTML: string = await page.$eval('#Main div:nth-child(2) > div', element => element.innerHTML);
            await page.close();

            resolve({
                annual: balanceSheetAnnualHTML,
                quarterly: balanceSheetQuarterlyHTML,
            } as rawHTMLs);

        } catch (error) {
            await page?.close();
            console.log('HTML fetch error: ' + error)
            reject(null);
        }
    });
}

const getFinancialData = (stock: string): Promise<stockFinancialDataInterface | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            const rawHTMLs: rawHTMLs = await getRawFinancialHTMLs(stock);

            const annualData: annualDataInterface[] = getAnnualData(rawHTMLs.annual);
            const quarterlyData: quarterlyDataInterface[] = getQuarterlyData(rawHTMLs.quarterly);

            const financialData: stockFinancialDataInterface = {
                annual: annualData,
                quarterly: quarterlyData,
            };

            resolve(financialData);
        } catch (error) {
            resolve(null);
        }

    });
}

const getAnnualData = (annualBalanceSheetHTML: string | undefined): annualDataInterface[] => {

    let financialData: annualDataInterface[] = [];
    if (annualBalanceSheetHTML === undefined) return financialData;
    try {
        const $ = load(annualBalanceSheetHTML);

        const tableHeader = $('.D\\(tbhg\\) > .D\\(tbr\\) > div:not(:first-child)');
        tableHeader.each((i, div) => {

            let data: annualDataInterface = {
                year: parseInt($(div).text().split('/')[2]),
                totalAssets: null,
                totalDebt: null,
                netTangibleAssets: null,
            };

            includeRows.map(includeRow => {
                const row = $(`.fi-row:contains("${includeRow.searchFor}")`).parent();
                const value: string = $(row).find(`div:nth-child(${i + 2})`).text();
                let saveValue: number | null = value === '-' ? null : parseInt(value.replace(',', '')) * 1000;
                const saveAs = includeRow.saveAs;
                data[saveAs] = saveValue;
            })

            financialData.push(data);
        });
    } catch (error) {
        console.log(error);
    }

    return financialData;
}

const getQuarterlyData = (quarterlyBalanceSheetHTML: string | undefined): quarterlyDataInterface[] => {

    let financialData: quarterlyDataInterface[] = [];
    if (quarterlyBalanceSheetHTML === undefined) return financialData;

    try {
        const $ = load(quarterlyBalanceSheetHTML);

        const tableHeader = $('.D\\(tbhg\\) > .D\\(tbr\\) > div:not(:first-child)');


        tableHeader.each((i, div) => {

            let data: quarterlyDataInterface = {
                year: parseInt($(div).text().split('/')[2]),
                quarter: Math.floor(parseInt($(div).text().split('/')[0]) / 3),
                totalAssets: null,
                totalDebt: null,
                netTangibleAssets: null,
            };

            includeRows.map(includeRow => {
                const row = $(`.fi-row:contains("${includeRow.searchFor}")`).parent();
                const value: string = $(row).find(`div:nth-child(${i + 2})`).text();
                let saveValue: number | null = value === '-' ? null : parseInt(value.replace(',', '')) * 1000;
                const saveAs = includeRow.saveAs;
                data[saveAs] = saveValue;
            })

            financialData.push(data);
        });
    } catch (error) {
        console.log(error);
    }

    return financialData;
}

export const saveFinancialData = async (): Promise<void> => {
    globalState.setFinanceState(STATE.DOING);
    const excludeKeys = ['finviz_last', 'finance_last'];
    try {
        const allKeys = await client.keys('*');
        const stocks = allKeys.filter(key => !excludeKeys.includes(key));

        for (let stock of stocks) {
            const data = await getFinancialData(stock);
            if (data !== null) {
                console.log(`${stock} financial data saved...`);
                await client.set(stock, JSON.stringify(data));
            } else {
                console.log(`Error fetching ${stock}, continuing...`)
            }
        }

        await client.set('finance_last', Date.now().toString());
        globalState.setFinanceState(STATE.DONE);
    } catch (error) {
        console.log('Financial save error', error);
        globalState.setFinanceState(STATE.ERROR);
    }
} 