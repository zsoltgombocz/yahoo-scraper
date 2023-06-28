Finviz cégek=
[
    https://finviz.com/screener.ashx?v=111&f=cap_smallover&o=company
    Market cap small (over 300$mln)
-
    https://finviz.com/screener.ashx?v=111&f=sec_financial&o=company
    Sector financial
    Ezek tuti nem kellenek, ezért kikell venni a felső listából
]

Két lista eredményét egymásból kivonni.

Redis => cég részvény név kulcs => 
    további adatok, akár lebontva késöbbi számolás miatt, számítási adatok is tárolódhatnak el.

Cégek szűrése Yahoo Finance-al:
https://finance.yahoo.com/quote/INTC/balance-sheet?p=INTC (példa)

Kép alapján a 3 adat fog kelleni és a képleteket kell rá használni. 

Képletek:
[Total Debt X 1,5 < Total Assets]

[Net Tangible Assets X 2 > Total Debt]

1, szűrés: (annual)
Mind a négy oszlopra igazak legyenek a képletek. (éves nézet)
Itt négy oszlop van, csak akkor felel meg ha mind a négy oszlopra igaz van.
Ezek amik a kereskedhető listára kerülnek.

2, szürés: (quarterly)
Ide legyen két változat: finviz cégek és az 1. szűrés eredményei.
Első oszlopban kell igazaknak lennie a kepekben és ezek a cégek amik a kereskedő listában maradnak vagy kerülnek ki.

Kimenetnek összesen 5 oszlop/fül Excel-ben:

1. Elmúlt 4 éves adatokon szűrt cégek és mind a négy oszlopnak megfelelnek.
2. Elmúlt 4 éves adatokon szűrt cégek és mind a négy oszlopnak megfelelnek + a negyedéves szűrés igaz rájuk.
3. Elmúlt 4 éves adatokon szűrt cégek és mind a négy oszlopnak megfelelnek + a negyedéves szűrés nem igaz rájuk.
4. Finviz cégek + a negyedéves szűrés igaz rájuk.
5. Finviz cégek igaz + a negyedéves szűrés nem igaz rájuk.