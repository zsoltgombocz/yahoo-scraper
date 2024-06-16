import Stock from "./Stock";
import FinvizService, { finvizStock } from "./services/FinvizService";
import YahooService from "./services/YahooService";
import { listType } from "./types";
import { logger } from "./utils/logger";
import { BROWSER } from "./browser";
import ExcelJS from 'exceljs';
import cron from 'node-cron';
import StockModel from './mongo/Stock';

export interface ServiceWrapperInterface {
    finvizService: FinvizService;
    yahooService: YahooService;
    stocks: Stock[];
}

export default class ServiceWrapper implements ServiceWrapperInterface {
    finvizService: FinvizService;
    yahooService: YahooService;
    stocks: Stock[] = [];

    constructor(finvizService: FinvizService, yahooService: YahooService) {
        this.finvizService = finvizService;
        this.yahooService = yahooService;
    }

    run = async (): Promise<void> => {
        const everyMonth = "0 0 15 1-12 *";
        const every3Day = "0 0 */3 * *";

        cron.schedule(everyMonth, () => {
            this.generateExcel();
        });

        cron.schedule(every3Day, async () => {
            await this.saveFinvizStocks();
            await this.updateStocks();
        });

        if (process.env.FETCH_ON_START === "1") {
            try {
                logger.info(`[SERVICE-WRAPPER]: Fething data on start...`);
                //await this.saveFinvizStocks();
                await this.updateStocks();
            } catch (error) {
                logger.info(`[SERVICE-WRAPPER-RUN]: ${error}`);
            }

        }
    }

    saveFinvizStocks = async () => {
        try {
            const scrapedStocks: finvizStock[] = await this.finvizService.getFinvizData();

            for (let i = 0; i < scrapedStocks.length; i++) {
                const stock = scrapedStocks[i];
                const res = await StockModel.findOneAndUpdate(
                    { name: stock.name }, 
                    { $set: { country: stock.country, sector: stock.sector} }, 
                    { upsert: true, new: true }
                );

                logger.info(`[MongoDB]: Stock updated, id: ${res.id}`)
            }
        } catch (error) {
            logger.info(`[SERVICE-WRAPPER-SAVE-STOCKS]: ${error}`);
        }
    }

    updateStocks = async () => {
        try {
            const stocks = await StockModel.find();

            for (const stock of stocks) {
                const financialData = await this.yahooService.getFinancialData(stock.name);
                if(financialData === null) {
                    logger.info(`[SERVICE-WRAPPER]: Got null as financial data for ${stock.name}`);
                    return;
                }
                
                stock.set('financials', financialData);
                const computedEligibility = Stock.getEligibility(financialData);
                const computedIncomePercentages = Stock.getIncomePercentage(financialData);

                if(computedEligibility && computedIncomePercentages) {
                    const eligibleListTypes = Stock.getListTypes(computedEligibility);
                    stock.set('computed', {...computedEligibility, ...computedIncomePercentages});
                    stock.set('list', eligibleListTypes);
                }

                await stock.save();
                logger.info(`[SERVICE-WRAPPER]: Updated stock "${stock.name}" from yahoo.`);
            }

            BROWSER?.close();
        } catch (error) {
            logger.info(`[SERVICE-WRAPPER-UPDATE-STOCKS]: ${error}`);
        }
    }

    generateExcel = async (): Promise<void> => {
        try {
            const workbook = new ExcelJS.Workbook();

            const stocks = await StockModel.find();

            const okStocks = stocks.filter(stock => stock.list.includes(listType.ANNUAL_OK_QUARTERLY_OK));

            const tab1 = stocks.filter(stock => stock.list.includes(listType.ANNUAL_OK));
            const tab2 = okStocks;
            const tab3 = stocks.filter(stock => stock.list.includes(listType.ANNUAL_OK_QUARTERLY_NO));
            const tab4 = stocks.filter(stock => stock.list.includes(listType.QUARTERLY_OK));
            const tab5 = stocks.filter(stock => stock.list.includes(listType.QUARTERLY_NO));

            const tabs = [
                { name: listType.ANNUAL_OK, data: tab1 },
                { name: listType.ANNUAL_OK_QUARTERLY_OK, data: tab2 },
                { name: listType.ANNUAL_OK_QUARTERLY_NO, data: tab3 },
                { name: listType.QUARTERLY_OK, data: tab4 },
                { name: listType.QUARTERLY_NO, data: tab5 }
            ];
            tabs.forEach(tab => {
                const worksheet = workbook.addWorksheet(tab.name);

                tab.data.forEach((stock) => {
                    worksheet.addRow([stock.name]);
                });
            });

            const percentWorksheet = workbook.addWorksheet('%');
            percentWorksheet.addRow([
                'Név', 'Szektor', 'Össz %', '1. %', '2. %', '3. %', '4. %', '5. %', 'Market Cap', 'Total assets/Total Liabilities'
            ]);

            okStocks.forEach(stock => {
                if(stock.financials?.balance?.annual === undefined) {
                    return;
                }
                
                const lastYearIncome =
                    stock.financials?.balance?.annual?.[stock?.financials?.balance?.annual?.length - 1];
                const lastYearAssets = lastYearIncome?.totalAssets || 0;
                const lastYearLiabilities = lastYearIncome?.totalLiabilities || 0
                const incomePercentages: number[] | undefined = stock.computed?.income?.annualPercentages?.filter((percentage) => percentage);

                const incomePercentageRows = incomePercentages == undefined ? new Array(5).fill(" ") : [...incomePercentages, ...(new Array(5 - incomePercentages?.length).fill(" "))];
                percentWorksheet.addRow([
                    stock.name,
                    stock?.sector,
                    stock.computed?.income?.avgPercentage,
                    ...incomePercentageRows,
                    stock.financials?.marketCap,
                    lastYearLiabilities === 0 ? null : lastYearAssets / lastYearLiabilities
                ]);
            });

            const percentOKWorksheet = workbook.addWorksheet('% OK');
            percentOKWorksheet.addRow([
                'Név', 'Szektor', 'Össz %', '1. %', '2. %', '3. %', '4. %', '5. %', 'Market Cap', 'Total assets/Total Liabilities'
            ]);

            okStocks
                .filter(stock =>
                    Stock.hasFourAnnualBalance(stock) &&
                    Stock.hasFourQuarterlyBalance(stock) &&
                    stock.computed?.income?.annualPercentages.length === 4
                )
                .forEach(stock => {
                    if(stock.financials?.balance?.annual === undefined) {
                        return;
                    }

                    const lastYearIncome =
                        stock.financials?.balance?.annual?.[stock?.financials?.balance?.annual?.length - 1];

                    const lastYearAssets = lastYearIncome?.totalAssets || 0;
                    const lastYearLiabilities = lastYearIncome?.totalLiabilities || 0

                    percentOKWorksheet.addRow([
                        stock.name,
                        stock?.sector,
                        stock.computed?.income?.avgPercentage,
                        ...stock.computed?.income?.annualPercentages || new Array(5).fill(" "),
                        stock.financials?.marketCap,
                        lastYearLiabilities === 0 ? null : lastYearAssets / lastYearLiabilities
                    ]);
                });

            const year = new Date().getFullYear();
            const month = new Date().getMonth() + 1;

            await workbook.xlsx
                .writeFile(`./public/${year}-${month < 10 ? '0' + month : month}.xlsx`);

            logger.info(`[SERVICE-WRAPPER]: Excel created!`);
        } catch (error: any) {
            logger.error(`[SERVICE-WRAPPER]: Error while creating excel: ${error}\n Trace: ${error.stack}`);
        }
    }
}