import express, { Application, Request, Response } from "express";
import processRoutes from './routes/process';
import scraperProcess from './routes/scraper';

const app: Application = express();

app.get("/", async (req: Request, res: Response): Promise<Response> => {
    return res.status(200).json({ version: '3.0', documentation: '' });
});

app.use('/process/', processRoutes);
app.use('/scraper/', scraperProcess);

export default app;