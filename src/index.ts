import express, { Application } from "express";
import routes from './routes';
import { client } from "./db";
import cron from "node-cron";
import 'dotenv/config';
import { runMonthlyCheck } from "./monthlyCheck";
import { logger } from "./utils/logger";

const app: Application = express();

app.use('/', routes);

const PORT = process.env.APP_PORT || 3000;

try {
    app.listen(PORT, (): void => {
        logger.info(`Connected successfully on port ${PORT}`);

        client.connect();
        const everyMonth = "0 0 15 1-12 *";

        cron.schedule(everyMonth, () => {
            runMonthlyCheck()
                .then(res => console.log(res))
        });
    });

} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}