import express, { Application, Request, Response } from "express";
import routes from './routes';
import { client } from "./db";
import { getFilteredStocks } from "./scrapeStocks";

const app: Application = express();

app.use('/', routes);

const PORT = 3000;

try {
    app.listen(PORT, (): void => {
        console.log(`Connected successfully on port ${PORT}`);

        client.connect();
    });

} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}