import express, { Application } from "express";
import routes from './routes';
import { client } from "./db";
import 'dotenv/config';

const app: Application = express();

app.use('/', routes);

const PORT = process.env.APP_PORT || 3000;

try {
    app.listen(PORT, (): void => {
        console.log(`Connected successfully on port ${PORT}`);

        client.connect();
    });

} catch (error: any) {
    console.error(`Error occured: ${error.message}`);
}