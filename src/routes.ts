import express, { Response, Request, Router } from "express";
import { STATE, globalState } from "./state";
import { client } from "./db";
import { saveFilteredStocks } from "./scrapeStocks";
import { saveFinancialData } from "./scrapeFinance";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    return res.status(200).send('Ver: 1.0.0');
});

router.get('/status', async (req: Request, res: Response): Promise<Response> => {
    const finvizLast = await client.get('finviz_last');
    const finvizLastUnix = parseInt(finvizLast || '0', 10);
    const finvizDate = new Date(finvizLastUnix);

    const financeLast = await client.get('finance_last');
    const financeLastUnix = parseInt(financeLast || '0', 10);
    const financeDate = new Date(financeLastUnix);

    return res.status(200).json({
        'finviz': {
            'status': globalState.stock,
            'last_fetch': finvizDate.toLocaleString(),
        },
        'finance': {
            'status': globalState.finance,
            'last_fetch': financeDate.toLocaleString(),
        }
    });
})

router.get('/stock', async (req: Request, res: Response): Promise<Response> => {
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
})

export default router;