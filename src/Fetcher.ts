import moment from "moment";
import Stock from "./Stock";
import FinvizService, { finvizStock } from "./services/FinvizService";

export interface FetcherInterface {
    finvizService: FinvizService;
}

export default class Fetcher implements FetcherInterface {
    finvizService: FinvizService;

    constructor(finvizService: FinvizService) {
        this.finvizService = finvizService;
    }

    saveFinvizStocks = async () => {
        const lastUpdate = await this.finvizService.getLastUpdate();
        const diff = moment.unix(lastUpdate / 1000 || 0).add(1, 'days').diff(moment.now(), 'hours');

        if (diff < 1 || lastUpdate === 0) {
            const scrapedStocks: finvizStock[] = await this.finvizService.getFinvizData();
            for (let i = 0; i < scrapedStocks.length; i++) {
                await new Stock(
                    scrapedStocks[i].name,
                    scrapedStocks[i].country,
                    scrapedStocks[i].sector
                ).save();
            }
        }
    }
}