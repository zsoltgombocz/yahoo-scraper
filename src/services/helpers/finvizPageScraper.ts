import 'dotenv/config';
import { load } from "cheerio";
import { logger } from '../../utils/logger';

type finvizStock = {
    name: string,
    company: string,
    sector: string,
    industry: string,
    country: string
}

async function finvizPageScraper(pageNumber: number): Promise<{stocks: finvizStock[], last: boolean}> {
    let stocks: finvizStock[] = [];
    let last = false;
    const r = (pageNumber - 1) * 20 + 1;
    const url = process.env.FINVIZ_BASE_URL + '&r=' + r;

    try {
        const page = await fetch(url);
        const body = await page.text();
        const $ = load(body);
        const rows = $("#screener-table tbody tbody tr");

        rows.each((_, tr) => {
            const name = $(tr).find('td:nth-child(2)');
            const company = $(tr).find('td:nth-child(3)');
            const sector = $(tr).find('td:nth-child(4)');
            const industry = $(tr).find('td:nth-child(5)');
            const country = $(tr).find('td:nth-child(6)');

            stocks.push({
                name: name.text(),
                company: company.text(),
                sector: sector.text(),
                industry: industry.text(),
                country: country.text(),
            } as finvizStock);
        });

        if(rows.length === 1) {
            last = true;
        }
    } catch (error) {
        logger.error(`Finviz Page Scraper: Error while scraping page. Message: ${error}`);
    }

    return {last, stocks};
}

export default finvizPageScraper;