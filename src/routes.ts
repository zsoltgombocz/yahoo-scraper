import express, { Response, Request, Router } from "express";
import { STATE, globalState } from "./state";
import { addStockToList, client, fetchType, getStock, getStocks, getStocksFromList, listType } from "./db";
import { saveFilteredStocks } from "./scrapeStocks";
import { saveFinancialData } from "./scrapeFinance";
import { checkStocks, getTypesBasedOnEligibility, isEligible } from "./filterStocks";
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

    const eligible = stockInfo.eligible;
    const types = getTypesBasedOnEligibility(eligible.annual, eligible.quarterly);
    await addStockToList(stockInfo.name, types)

    return res.status(200).send(`${types}`);
})

router.get('/rawlist/:list', async (req: Request, res: Response): Promise<Response> => {
    const stocks = await getStocksFromList(req.params.list);

    return res.status(200).json(stocks);
})

router.get('/list', async (req: Request, res: Response): Promise<any> => {
    const workbook = new ExcelJS.Workbook();
    const tab1 = await getStocksFromList(listType.ANNUAL_OK);
    const tab2 = await getStocksFromList(listType.ANNUAL_OK_QUARTERLY_OK);
    const tab3 = await getStocksFromList(listType.ANNUAL_OK_QUARTERLY_NO);
    const tab4 = await getStocksFromList(listType.QUARTERLY_OK);
    const tab5 = await getStocksFromList(listType.QUARTERLY_NO);

    const tabs = [
        { name: listType.ANNUAL_OK, data: tab1 },
        { name: listType.ANNUAL_OK_QUARTERLY_OK, data: tab2 },
        { name: listType.ANNUAL_OK_QUARTERLY_NO, data: tab3 },
        { name: listType.QUARTERLY_OK, data: tab4 },
        { name: listType.QUARTERLY_NO, data: tab5 }
    ];

    tabs.forEach(tab => {
        const worksheet = workbook.addWorksheet(tab.name);

        tab.data.forEach((value: string) => {
            worksheet.addRow([value]);
        });
    });

    const stream = new MemoryStream();

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        'attachment; filename=' + 'data.xlsx'
    );

    workbook.xlsx.write(stream).then(() => {
        stream.on('end', () => {
            res.end();
        });
        stream.pipe(res);
    });
});

export default router;