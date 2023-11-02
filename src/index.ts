import express, { Application } from "express";
import routes from './routes';
import { client } from "./redis/client";
import 'dotenv/config';
import { logger } from "./utils/logger";
import { formatDateMiddleware } from "./utils/formatDate";
import FinvizService from "./services/FinvizService";
import YahooService from "./services/YahooService";
import ServiceWrapper from "./ServiceWrapper";

const app: Application = express();

app.use(formatDateMiddleware);
app.use('/', routes);

const PORT = process.env.APP_PORT || 3000;

try {
    app.listen(PORT, async (): Promise<void> => {
        logger.info(`APP: Connected successfully on port ${PORT}`);

        await client.connect();

        const finvizService = await new FinvizService(process.env.FINVIZ_BASE_URL, process.env.FINVIZ_EXCLUDE_URL).create();
        const yahooService = await new YahooService(process.env.YAHOO_FINANCE_URL).create();
        const serviceWrapper = new ServiceWrapper(finvizService, yahooService);
        serviceWrapper.run();
    });
} catch (error: any) {
    console.error(`APP: Error occured: ${error.message}`);
}