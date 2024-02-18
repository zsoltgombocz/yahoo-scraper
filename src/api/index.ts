import express, { Application } from "express";
import routes from './routes';

import 'dotenv/config';

const app: Application = express();

app.use('/', routes);

export default app;