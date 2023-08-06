import { BROWSER, getPage } from './browser';
import { load } from "cheerio";
import { STATE, globalState } from './state';
import { annualDataInterface, fetchType, getStockNames, incomeDatainterface, quarterlyDataInterface, saveUpdateTime, stockFinancialDataInterface, stockInterface, updateStock } from './db';
import { Page } from 'puppeteer';
import { logger } from './utils/logger';

interface rawHTMLs {
    annual: string | undefined;
    quarterly: string | undefined;
}

const includeRows = [
    { searchFor: 'Total Assets', saveAs: 'totalAssets' },
    { searchFor: 'Total Liabilities Net Minority Interest', saveAs: 'totalLiabilities' },
    { searchFor: 'Total Equity Gross Minority Interest', saveAs: 'totalEquity' },
    { searchFor: 'Total Revenue', saveAs: 'totalRevenue' },
    { searchFor: 'Net Income Common Stockholders', saveAs: 'NICS' },
];

const getBalanceSheetURL = (stock: string): string => {
    return `${process.env.YAHOO_FINANCE_URL}/${stock}/balance-sheet?p=${stock}`;
}

const getIncomeURL = (stock: string): string => {
    return `${process.env.YAHOO_FINANCE_URL}/${stock}/financials?p=${stock}`;
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

            await acceptCookie(page);

            await page.setViewport({ width: 1080, height: 1024 });

            await page.waitForSelector('#Main');
            const balanceSheetAnnualHTML: string = await page.$eval('#Main div:nth-child(2) > div', element => element.innerHTML);

            await page.waitForSelector('#Main .IbBox:nth-child(2) > button', { timeout: 5000 });

            await new Promise(resolve => setTimeout(resolve, 2500));

            await page.click('#Main .IbBox:nth-child(2) > button');

            await new Promise(resolve => setTimeout(resolve, 2500));

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

const getRawIncomeHTML = (stock: string): Promise<string | null> => {
    const yahooURL = getIncomeURL(stock);

    return new Promise(async (resolve, reject) => {
        let page: Page | undefined;
        try {
            page = await getPage(yahooURL);

            await acceptCookie(page);

            await page.setViewport({ width: 1080, height: 1024 });

            await page.waitForSelector('#Main');
            const incomeSheetHTML: string = await page.$eval('#Main div:nth-child(2) > div', element => element.innerHTML);

            await page.waitForTimeout(2000);

            await page.close();

            resolve(incomeSheetHTML);

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

const getIncomeData = (stock: string): Promise<incomeDatainterface[] | null> => {
    return new Promise(async (resolve, reject) => {
        try {
            const rawHTML: string | null = await getRawIncomeHTML(stock);

            let incomeData: incomeDatainterface[] = [];

            if (rawHTML === null || rawHTML.length === 0) return incomeData;

            const $ = load(rawHTML);

            const tableHeader = $('.D\\(tbhg\\) > .D\\(tbr\\) > div:not(:first-child)');

            tableHeader.each((i, div) => {
                const headerText = $(div).text();

                let data: incomeDatainterface = {
                    year: headerText === 'ttm' ? 0 : parseInt(headerText.split('/')[2]),
                    totalRevenue: null,
                    NICS: null,
                };

                includeRows.map(includeRow => {
                    const row = $(`.fi-row:contains("${includeRow.searchFor}")`).parent();
                    if (row.html() !== null) {
                        const value: string = $(row).find(`div:nth-child(${i + 2})`).text();
                        let saveValue: number | null = value === '-' ? null : parseInt(value.replaceAll(',', ''));
                        const saveAs = includeRow.saveAs;
                        data[saveAs] = saveValue;
                    }
                })

                incomeData.push(data);
            });

            resolve(incomeData);
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
                totalEquity: null,
                totalLiabilities: null,
            };

            includeRows.map(includeRow => {
                const row = $(`.fi-row:contains("${includeRow.searchFor}")`).parent();
                if (row.html() !== null) {
                    const value: string = $(row).find(`div:nth-child(${i + 2})`).text();
                    let saveValue: number | null = value === '-' ? null : parseInt(value.replaceAll(',', ''));
                    const saveAs = includeRow.saveAs;
                    data[saveAs] = saveValue;
                }
            })

            financialData.push(data);
        });
    } catch (error) {
        console.log('Error while getting annual data from html:', error);
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
            const quarterRaw = parseInt($(div).text().split('/')[0]);
            let data: quarterlyDataInterface = {
                year: parseInt($(div).text().split('/')[2]),
                quarter: quarterRaw < 3 ? 1 : Math.ceil(quarterRaw / 3),
                totalAssets: null,
                totalLiabilities: null,
                totalEquity: null,
            };

            includeRows.map(includeRow => {
                const row = $(`.fi-row:contains("${includeRow.searchFor}")`).parent();
                if (row.html() !== null) {
                    const value: string = $(row).find(`div:nth-child(${i + 2})`).text();
                    let saveValue: number | null = value === '-' ? null : parseInt(value.replaceAll(',', ''));
                    const saveAs = includeRow.saveAs;
                    data[saveAs] = saveValue;
                }
            })

            financialData.push(data);
        });
    } catch (error) {
        console.log('Error while getting quarterly data from html:', error);
    }

    return financialData;
}

export const saveFinancialData = async (stockName?: string): Promise<void | stockInterface> => {

    try {
        let stocks: string[] = [];

        if (stockName === undefined || stockName.length === 0) {
            globalState.setFinanceState(STATE.DOING);
            stocks = await getStockNames();
        } else {
            stocks = [stockName];
        }

        for (let stock of stocks) {
            const data = await getFinancialData(stock);
            const incomeData = await getIncomeData(stock);

            if (data !== null && incomeData !== null) {
                logger.info(`${stock} financial data saved from Yahoo.`);

                const stockObject: stockInterface = {
                    name: stock,
                    financialData: data,
                    eligible: {
                        annual: null,
                        quarterly: null,
                    },
                    list: [],
                    incomeData,
                    incomePercent: null,
                };

                await updateStock(stock, stockObject);

                if (stockName !== undefined) return stockObject;
            } else {
                console.log(`Error fetching ${stock}, continuing...`)
            }
        }
        if (stockName === undefined) {
            await saveUpdateTime(fetchType.YAHOO, Date.now());

            globalState.setFinanceState(STATE.DONE);
        }
        BROWSER?.close();
    } catch (error) {
        console.log('Financial save error', error);
        globalState.setFinanceState(STATE.ERROR);
        BROWSER?.close();
    }
} 