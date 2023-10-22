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

    loadServiceState = async () => {
        const status = await this.serviceState.get();
        this.status = status?.status || scraperStatus.HALTED;
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
        return state === null ? 0 : (state?.timestamp || 0);
    }
} 