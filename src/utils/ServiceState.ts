
import { client } from "../redis/client";
import { scraperStatus } from "../types";

export type scraperState = {
    timestamp: number;
    status: scraperStatus;
}

export class ServiceState {
    signature: string;

    constructor(signature: string) {
        this.signature = signature;
    }

    get = async (): Promise<scraperState | null> => {
        const data: string | null = await client.get(this.signature);

        if (data === null) return null;

        return JSON.parse(data) as scraperState;
    }

    //? Do not need to wait for anything this can happen in the background
    save = (status: scraperStatus): void => {
        client.set(this.signature, JSON.stringify({ status, timestamp: new Date().getTime() }));
    }
}