import express, { Application } from "express";
import routes from './routes';
import { client } from "./redis/client";
import 'dotenv/config';
import { logger } from "./utils/logger";
import { formatDateMiddleware } from "./utils/formatDate";
import FinvizService from "./services/FinvizService";
import Fetcher from "./Fetcher";

const app: Application = express();

app.use(formatDateMiddleware);
app.use('/', routes);

const PORT = process.env.APP_PORT || 3000;

try {
    app.listen(PORT, async (): Promise<void> => {
        logger.info(`APP: Connected successfully on port ${PORT}`);

        await client.connect();

        const finvizService = new FinvizService(process.env.FINVIZ_BASE_URL, process.env.FINVIZ_EXCLUDE_URL);
        const fetcher = new Fetcher(finvizService);

        fetcher.saveFinvizStocks();
    });
} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}