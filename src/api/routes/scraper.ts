import express, { Router, Request, Response } from "express";
import ProcessManager from "../../processes/ProcessManager";
import ScraperService from "../../services/ScraperService";

const router: Router = express.Router();
const processManager = new ProcessManager();
const scraper = new ScraperService(process.env.FINVIZ_BASE_URL, process.env.YAHOO_FINANCE_URL);

router.get("/all", async (_req: Request, res: Response): Promise<Response> => {
    scraper.scrapeStockList();
    
    //create a process for the whole scraping and return it
    const process = processManager.addProcess('scrape-all');

    return res.json(process);
});

export default router;