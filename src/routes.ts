import express, { Response, Request, Router } from "express";
import { STATE, globalState } from "./state";
import { addStockToList, client, fetchType, getStock, getStocks, getStocksFromList, listType, saveIncomePercentage, stockInterface } from "./db";
import { saveFilteredStocks } from "./scrapeStocks";
import { saveFinancialData } from "./scrapeFinance";
import { checkStocks, getIncomePercentage, getTypesBasedOnEligibility, isEligible } from "./filterStocks";
import ExcelJS from 'exceljs';
import MemoryStream from 'memorystream';

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    return res.status(200).send('Ver: 1.0.0');
});

router.get('/status', async (req: Request, res: Response): Promise<Response> => {
    const finviz = await client.get(`${fetchType.FINVIZ}_last`);
    const yahoo = await client.get(`${fetchType.YAHOO}_last`);
    const eligible = await client.get(`${fetchType.ELIGIBLE}_last`);

    return res.status(200).json({
        [fetchType.FINVIZ]: {
            'status': globalState.stock,
            'last_fetch': finviz ? new Date(parseInt(finviz || '0')).toLocaleString() : null,
        },
        [fetchType.YAHOO]: {
            'status': globalState.finance,
            'last_fetch': yahoo ? new Date(parseInt(yahoo || '0')).toLocaleString() : null,
        },
        [fetchType.ELIGIBLE]: {
            'status': globalState.eligible,
            'last_fetch': eligible ? new Date(parseInt(eligible || '0')).toLocaleString() : null,
        }
    });
})

router.get('/fetch/stock', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.stock !== STATE.DOING) {
        saveFilteredStocks();
    }

    return res.status(200).send(`${globalState.stock}. A "/status" oldalon lehet látni az állapotot.`);
})

router.get('/fetch/finance', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.finance !== STATE.DOING) {
        saveFinancialData();
    }

    return res.status(200).send(`${globalState.finance}. A "/status" oldalon lehet látni az állapotot.`);
});

router.get('/info', async (req: Request, res: Response): Promise<Response> => {
    const stocks = await getStocks();

    return res.status(200).json(stocks);
})

router.get('/info/:stock', async (req: Request, res: Response): Promise<Response> => {
    const stockInfo = await getStock(req.params.stock);

    return res.status(200).json(stockInfo);
})

router.get('/eligible/:stock', async (req: Request, res: Response): Promise<Response> => {
    const stockInfo = await getStock(req.params.stock);
    const eligible = stockInfo !== null ? isEligible(stockInfo) : null;

    return res.status(200).json(eligible);
})

router.get('/check', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.eligible !== STATE.DOING) {
        checkStocks();
    }

    return res.status(200).send(`${globalState.eligible}. A "/status" oldalon lehet látni az állapotot.`);
})

router.get('/fetch/:stock', async (req: Request, res: Response): Promise<Response> => {
    const data = await saveFinancialData(req.params.stock);

    return res.status(200).send(data);
});

router.get('/check/:stock', async (req: Request, res: Response): Promise<Response> => {
    const stockInfo = await getStock(req.params.stock);
    if (stockInfo === null) return res.status(200).send(`Nincs adat erről a cégről.`);

    const stockIsEligible = await isEligible(stockInfo);
    const eligible = stockInfo.eligible;
    const types = getTypesBasedOnEligibility(eligible.annual, eligible.quarterly);
    const percentage = getIncomePercentage(stockInfo);
    await addStockToList(stockInfo.name, types)
    await saveIncomePercentage(stockInfo.name, percentage)

    return res.status(200).json({
        list: types,
        percentage,
    });
})

router.get('/rawlist/:list', async (req: Request, res: Response): Promise<Response> => {
    const stocks = await getStocksFromList(req.params.list);

    return res.status(200).json(stocks);
})

router.get('/list', async (req: Request, res: Response): Promise<any> => {
    const workbook = new ExcelJS.Workbook();
    const okStocks = await getStocksFromList(listType.ANNUAL_OK_QUARTERLY_OK);
    const tab1 = await getStocksFromList(listType.ANNUAL_OK);
    const tab2 = okStocks;
    const tab3 = await getStocksFromList(listType.ANNUAL_OK_QUARTERLY_NO);
    const tab4 = await getStocksFromList(listType.QUARTERLY_OK);
    const tab5 = await getStocksFromList(listType.QUARTERLY_NO);

    //0<x<=5
    const tab6 = okStocks.filter(
        stock => stock.incomePercent !== null && stock.incomePercent <= 5 && stock.incomePercent > 0);

    //5<x<20
    const tab7 = okStocks.filter(
        stock => stock.incomePercent !== null && stock.incomePercent > 5 && stock.incomePercent < 20);

    //x>=20   
    const tab8 = okStocks.filter(
        stock => stock.incomePercent !== null && stock.incomePercent >= 20);

    const tabs = [
        { name: listType.ANNUAL_OK, data: tab1 },
        { name: listType.ANNUAL_OK_QUARTERLY_OK, data: tab2 },
        { name: listType.ANNUAL_OK_QUARTERLY_NO, data: tab3 },
        { name: listType.QUARTERLY_OK, data: tab4 },
        { name: listType.QUARTERLY_NO, data: tab5 },
        { name: '0<x<=5', data: tab6 },
        { name: '5<x<20', data: tab7 },
        { name: 'x>=20', data: tab8 }
    ];

    tabs.forEach(tab => {
        const worksheet = workbook.addWorksheet(tab.name);

        tab.data.forEach((value: stockInterface) => {
            worksheet.addRow([value.name]);
        });
    });

    const stream = new MemoryStream();
    const now = new Date().toLocaleDateString();

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + `${now}.xlsx`
    );

    workbook.xlsx.write(stream).then(() => {
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res);
    });
});

export default router;