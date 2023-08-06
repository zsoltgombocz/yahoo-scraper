import { getStocks, listType, stockInterface } from "./db";
import ExcelJS from 'exceljs';

export const generateExcel = () => {
    return new Promise(async (resolve) => {
        try {
            const workbook = new ExcelJS.Workbook();
            let stocks: stockInterface[] = await getStocks();
            const okStocks = stocks.filter(stock => stock.list.includes(listType.ANNUAL_OK_QUARTERLY_OK));
            const tab1 = stocks.filter(stock => stock.list.includes(listType.ANNUAL_OK));
            const tab2 = okStocks;
            const tab3 = stocks.filter(stock => stock.list.includes(listType.ANNUAL_OK_QUARTERLY_NO));
            const tab4 = stocks.filter(stock => stock.list.includes(listType.QUARTERLY_OK));
            const tab5 = stocks.filter(stock => stock.list.includes(listType.QUARTERLY_NO));

            const tabs = [
                { name: listType.ANNUAL_OK, data: tab1 },
                { name: listType.ANNUAL_OK_QUARTERLY_OK, data: tab2 },
                { name: listType.ANNUAL_OK_QUARTERLY_NO, data: tab3 },
                { name: listType.QUARTERLY_OK, data: tab4 },
                { name: listType.QUARTERLY_NO, data: tab5 }
            ];

            tabs.forEach(tab => {
                const worksheet = workbook.addWorksheet(tab.name);

                tab.data.forEach((value: stockInterface) => {
                    worksheet.addRow([value.name]);
                });
            });

            const percentWorksheet = workbook.addWorksheet('%');
            percentWorksheet.addRow([
                'Név', 'Szektor', 'Össz %', '1. %', '2. %', '3. %', '4. %', '5. %'
            ]);

            okStocks.forEach(stock => {
                percentWorksheet.addRow([stock.name, stock?.sector, stock.incomePercent, ...stock.incomePercentages || []]);
            })

            const year = new Date().getFullYear();
            const month = new Date().getMonth() + 1;

            workbook.xlsx
                .writeFile(`./public/${year}-${month < 10 ? '0' + month : month}.xlsx`);

            resolve('ok');
        } catch (error) {
            console.log(error);
        }
    });
}