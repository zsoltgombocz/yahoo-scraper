import puppeteer, { Browser, Page } from "puppeteer";

export let BROWSER: Browser | null = null;

const getBrowser = (): Promise<Browser> => {
    return new Promise(async (resolve, reject) => {
        try {
            BROWSER = await puppeteer.launch({ headless: false, timeout: 60000 });

            resolve(BROWSER);
        } catch (error) {
            reject(null);
        }
    });
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