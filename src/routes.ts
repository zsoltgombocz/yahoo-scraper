import express, { Response, Request, Router } from "express";
import { STATE, globalState } from "./state";
import { addStockToList, client, fetchType, getStock, getStockNames, getStocks, getStocksFromList, listType, saveIncomePercentage, stockInterface, updateStock } from "./db";
import { saveFilteredStocks } from "./scrapeStocks";
import { saveFinancialData } from "./scrapeFinance";
import { checkStocks, getIncomePercentage, getTypesBasedOnEligibility, isEligible } from "./filterStocks";
import ExcelJS from 'exceljs';
import MemoryStream from 'memorystream';
import { generateExcel } from "./generateExcel";
import { runMonthlyCheck } from "./monthlyCheck";

const fs = require('fs');

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

router.get('/finviz', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.stock !== STATE.DOING) {
        saveFilteredStocks();
    }

    return res.status(200).send(`${globalState.stock}. A "/status" oldalon lehet látni az állapotot.`);
})

router.get('/finance', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.finance !== STATE.DOING) {
        saveFinancialData();
    }

    return res.status(200).send(`${globalState.finance}. A "/status" oldalon lehet látni az állapotot.`);
});

router.get('/check', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.eligible !== STATE.DOING) {
        checkStocks();
    }

    return res.status(200).send(`${globalState.eligible}. A "/status" oldalon lehet látni az állapotot.`);
})

router.get('/info', async (req: Request, res: Response): Promise<Response> => {
    const stocks = await getStocks();

    return res.status(200).json(stocks);
})

router.get('/info/:stock', async (req: Request, res: Response): Promise<Response> => {
    const stockInfo = await getStock(req.params.stock);

    return res.status(200).json(stockInfo);
})

router.get('/update', async (req: Request, res: Response): Promise<Response> => {
    runMonthlyCheck();

    return res.status(200).send('Frissítés elindítva, a /status oldalon lehet látni hol tart.');
});

router.get('/generate', async (req: Request, res: Response): Promise<any> => {
    await generateExcel();

    return res.status(200).send('Generálva.');
});

router.get('/download/:year/:month', async (req: Request, res: Response): Promise<any> => {
    const year = req.params.year;
    const month = req.params.month;

    return res.download(`${process.cwd()}/public/${year}-${month}.xlsx`);
});

export default router;