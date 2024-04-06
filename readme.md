# Yahoo Scraper
From a pre filtered list it lets you scrape financial information about a stock from Yahoo Finance. The pre filetered company list is scraped from https://finviz.com.

## Notice
This project was made to support our work. Not intended to publish as an open source API, feel free to use the code to make your own API or modify
the scraping but please **leave a star** when you do so.

## Finviz source URL
- [https://finviz.com/screener.ashx?v=111&f=cap_smallover&o=company]

This list represents the "appropriate" companies. When there is a new company we must label it in the admin's database as new, also check that are there any companies that not scraped due to the filtering and label them as "inappropriate" and let the user delete it. 

## Getting financial info from Yahoo
The API can start the scraping processes and then the results is going to be saved in a MySQL database which is an admin
website's database (Laravel Filament). Update only the neccessary informations, if nothing changed then do nothing. 

This approach lets the user from the admin panel start a scraping process for a company or even start a whole update process for all the companies.
With this we do not have to rely on HTTP requests to get infomation, simply track the scraping processes and update the admin panel to visually show that it is updating. 

## Store data in Redis
The scraping processes are stored in a Redis DB and with the API it can be easily retrieved, polling these endpoints can give information about each process.

Also storing the list of the possibly companies just to be sure that always working with the right ones.

## Updating the stock informations
Automatically: Every 5th day the finviz list is going to be updated along with the financial information with cron job.
Manually: Manually update a stock data from the admin panel or start a new scraping process where the finviz and financial information is going to pe updated.