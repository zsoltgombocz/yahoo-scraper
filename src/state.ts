export enum STATE {
    DONE = "Kész",
    DOING = "Folyamatban",
    ERROR = "Hiba",
};

interface scrapeState {
    stock: STATE,
    setStocksState: (state: STATE) => void,
}

export const globalState: scrapeState = {
    stock: STATE.DONE,

    setStocksState: (state: STATE): void => {
        globalState.stock = state;
    }
}
