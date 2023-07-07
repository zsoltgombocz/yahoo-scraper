export enum STATE {
    DONE = "Kész",
    DOING = "Folyamatban",
    ERROR = "Hiba",
};

interface scrapeState {
    stock: STATE,
    finance: STATE,
    eligible: STATE,
    setStocksState: (state: STATE) => void,
    setFinanceState: (state: STATE) => void,
    setEligibleState: (state: STATE) => void,
}

export const globalState: scrapeState = {
    stock: STATE.DONE,
    finance: STATE.DONE,
    eligible: STATE.DONE,

    setStocksState: (state: STATE): void => {
        globalState.stock = state;
    },

    setFinanceState: (state: STATE): void => {
        globalState.finance = state;
    },

    setEligibleState: (state: STATE): void => {
        globalState.eligible = state;
    }
}
