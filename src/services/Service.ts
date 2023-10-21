import { scraperStatus } from "../types";
import { ServiceState } from "../utils/ServiceState";

export default abstract class Service {
    status: scraperStatus = scraperStatus.HALTED;
    readonly signature: string;
    serviceState: ServiceState;

    constructor(signature: string) {
        this.signature = signature;
        this.serviceState = new ServiceState(this.signature);
    }

    getStatus = (): scraperStatus => {
        return this.status;
    }

    setStatus = (status: scraperStatus): void => {
        this.status = status;
        this.serviceState.save(this.status);
    }

    getLastUpdate = async (): Promise<number> => {
        const state = await this.serviceState.get();
        return state?.timestamp || 0;
    }
} 