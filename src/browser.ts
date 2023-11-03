import puppeteer, { Browser, Page } from "puppeteer";
import 'dotenv/config';
import { logger } from "./utils/logger";

export let BROWSER: Browser | null = null;

const getBrowser = (): Promise<Browser> => {
    return new Promise(async (resolve, reject) => {
        try {
            BROWSER = await puppeteer.launch({
                timeout: 60000,
                headless: true,
                args: [
                    "--no-sandbox",
                    "--disable-gpu",
                ]
            });

            resolve(BROWSER);
        } catch (error) {
            logger.error(`[BROWSER]: ${error}`);
            reject(null);
        }
    });
}

export const acceptCookie = (page: Page) => {
    return new Promise(async (resolve) => {
        page.waitForSelector('.accept-all', {
            timeout: 2000
        })
            .then(() => {
                page.click('.accept-all');
                resolve('Cookie: Accepted.');
            })
            .catch(() => resolve('Cookie: Nothing to accept.'))
            .finally(() => resolve('Cookie: Done.'));
    })
}

export const getPage = (url: string): Promise<Page> => {
    return new Promise(async (resolve, reject) => {
        if (BROWSER === null) {
            await getBrowser();
        }

        try {
            const page = await BROWSER?.newPage();
            if (page === undefined) {
                reject(null);
            } else {
                await page.goto(url, {
                    waitUntil: "networkidle2",
                    timeout: 60000
                });

                resolve(page);
            }
        } catch (error) {
            reject(error);
        }
    })
}