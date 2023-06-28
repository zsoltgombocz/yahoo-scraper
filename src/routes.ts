import express, { Response, Request, Router } from "express";
import { STATE, globalState } from "./state";
import { getFilteredStocks } from "./scrapeStocks";
import { client } from "./db";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    return res.status(200).send('Ver: 1.0.0');
});

router.get('/status', async (req: Request, res: Response): Promise<Response> => {
    const finvizLast = await client.get('finviz_last')
    const finvizLastUnix = parseInt(finvizLast || '0', 10);
    const finvizDate = new Date(finvizLastUnix);
    console.log(finvizDate);

    return res.status(200).json({
        'finviz': {
            'status': globalState.stock,
            'last_fetch': finvizDate.toLocaleString(),
        }
    });
})

router.get('/fetch', async (req: Request, res: Response): Promise<Response> => {
    if (globalState.stock !== STATE.DOING) {
        getFilteredStocks();
    }

    return res.status(200).send(`${globalState.stock}. A "/status" oldalon lehet látni az állapotot.`);
})

export default router;