export enum listType {
    ANNUAL_OK = 'annual_ok', ANNUAL_OK_QUARTERLY_OK = 'annual_ok_quarterly_ok',
    ANNUAL_OK_QUARTERLY_NO = 'annual_ok_quarterly_no', QUARTERLY_OK = 'quarterly_ok',
    QUARTERLY_NO = 'quarterly_no',
}

export enum scraperStatus {
    PENDING = 'pending',
    FINISHED = 'finished',
    ERROR = 'error',
    HALTED = 'halted',
}