# Részvény kereső
Előre meghatározott lista exportálása, mentése, majd megfelelő képletekkel további szűrés és lista létrehozása Excel-ben.

## Finviz cégek listája
- [https://finviz.com/screener.ashx?v=111&f=cap_smallover&o=company]
- [https://finviz.com/screener.ashx?v=111&f=sec_financial&o=company]

Két lista eredményét egymásból kivonni.

## Cégek szűrése Yahoo Finance-al:
- [https://finance.yahoo.com/quote/INTC/balance-sheet?p=INTC] (példa)

Kép alapján a 3 adat fog kelleni és a képleteket kell rá használni. 

![](https://github.com/zsoltgombocz/stock-filter/blob/master/ext/cells_to_use.png?raw=true)

### Képletek:
- [Total Debt X 1,5 < Total Assets]
- [Net Tangible Assets X 2 > Total Debt]


### 1. szűrés: (annual)
Mind a négy oszlopra igazak legyenek a képletek. (éves nézet)
Ezek amik a kereskedhető listára kerülnek.

### 2. szürés: (quarterly)
Ide legyen két változat: finviz cégek és az 1. szűrés eredményei.
Első oszlopban kell igazaknak lennie a képleteknek és ezek a cégek amik a kereskedő listában maradnak vagy kerülnek le.

## Kimenetnek összesen 5 oszlop/fül Excel-ben:

1. Elmúlt 4 éves adatokon szűrt cégek és mind a négy oszlopnak megfelelnek.
2. Elmúlt 4 éves adatokon szűrt cégek és mind a négy oszlopnak megfelelnek + a negyedéves szűrés igaz rájuk.
3. Elmúlt 4 éves adatokon szűrt cégek és mind a négy oszlopnak megfelelnek + a negyedéves szűrés nem igaz rájuk.
4. Finviz cégek + a negyedéves szűrés igaz rájuk.
5. Finviz cégek igaz + a negyedéves szűrés nem igaz rájuk.
