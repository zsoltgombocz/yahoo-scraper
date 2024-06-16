import express, { Response, Request, Router } from "express";
import Stock from "./mongo/Stock";
import { ServiceState } from "./utils/ServiceState";
import ServiceWrapper from "./ServiceWrapper";
import FinvizService from "./services/FinvizService";
import YahooService from "./services/YahooService";

const router: Router = express.Router();

router.get("/", async (req: Request, res: Response): Promise<Response> => {
    return res.status(200).send('Version: 2.0');
});

router.get("/service/:signature", async (req: Request, res: Response): Promise<Response> => {
    const service = await new ServiceState(req.params.signature).get();

    return res.status(200).json(service);
});

router.get("/stock/:name", async (req: Request, res: Response): Promise<Response> => {
    const stock = await Stock.find({ name: req.params.name });
    
    return res.status(200).json(stock);
});

router.get('/download/:year/:month', async (req: Request, res: Response): Promise<any> => {
    const year = req.params.year;
    const month = req.params.month;

    return res.download(`${process.cwd()}/public/${year}-${month}.xlsx`);
});

router.get('/generate', async (req: Request, res: Response): Promise<any> => {
    const serviceWrapper = new ServiceWrapper({} as FinvizService, {} as YahooService);
    await serviceWrapper.generateExcel();

    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    return res.download(`${process.cwd()}/public/${year}-${month < 10 ? '0' + month : month}.xlsx`);
});

export default router;