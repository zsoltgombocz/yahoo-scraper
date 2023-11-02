import express, { Response, Request, Router } from "express";
import Stock from "./Stock";
import { ServiceState } from "./utils/ServiceState";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    const stock = await new Stock('INTC').load();

    return res.status(200).json(stock);
});

router.get("/service/:signature", async (req: Request, res: Response): Promise<Response> => {
    const service = await new ServiceState(req.params.signature).get();

    return res.status(200).json(service);
});

router.get("/stock/:name", async (req: Request, res: Response): Promise<Response> => {
    const stock = await new Stock(req.params.name).load();

    if (!stock.exists) {
        return res.status(404).send();
    }

    return res.status(200).json(stock);
});

export default router;