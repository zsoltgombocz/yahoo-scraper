import { client } from "../redis/client"

enum ProcessStatus {
    PENDING = 'PENDING',
    ERROR = 'ERROR'
}

type Process = {
    id: string,
    status: ProcessStatus,
    message: string | null,
    started: number,
}

interface ProcessManagerInterface {
    addProcess(id: string): Promise<Process>
    deleteProcess(id: string): Promise<boolean> 
    getProcess(id: string): Promise<Process | null>
    setProcess(id: string, status: ProcessStatus, message: string | null): Promise<Process | null>
    getAll(): Promise<Process[]>
}

/**
 * Utility class to manage processes, this class only for storing process related information
 * and keep track of the created tasks. 
 *
 * @class ProcessManager
 * @implements {ProcessManagerInterface}
 */
class ProcessManager implements ProcessManagerInterface {
    scanOption = {
        TYPE: 'string',
        MATCH: 'process_*',
    }

    constructor() {}

    addProcess(id: string): Promise<Process> {
        return new Promise(async (resolve, _reject) => {
            const process: Process = {
                id, status: ProcessStatus.PENDING, message: null, started: Date.now()
            };

            await client.set('process_' + id, JSON.stringify(process));

            resolve(process);
        });
    }

    deleteProcess(id: string): Promise<boolean> {
        return new Promise(async (resolve, _reject) => {

            await client.del('process_' + id);

            resolve(true);
        });
    }

    getProcess(id: string): Promise<Process | null> {
        return new Promise(async (resolve, _reject) => {

            const process = await client.get('process_' + id);

            if(process === null) {
                resolve(null);
            }

            const parsedProcess: Process = JSON.parse(process!);

            resolve(parsedProcess);
        });
    }

    setProcess(id: string, status: ProcessStatus, message: string | null): Promise<Process | null> {
        return new Promise(async (resolve, _reject) => {

            const process = await client.get('process_' + id);

            if(process === null) {
                resolve(null);
            }

            const parsedProcess: Process = JSON.parse(process!);
            const updateProcess: Process = {
                ...parsedProcess, 
                status,
                message
            }

            await client.set('process_' + id, JSON.stringify(updateProcess));

            resolve(updateProcess);
        });
    }

    getAll(): Promise<Process[]> {
        return new Promise(async (resolve, _reject) => {
            const processes: Process[] = [];

            for await (const key of client.scanIterator(this.scanOption)) {
                const process = await client.get(key)!;

                const parsedProcess: Process = JSON.parse(process!);

                processes.push(parsedProcess);
            }

            resolve(processes);
        });
    }
}

export default ProcessManager;