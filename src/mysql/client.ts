import mysql from 'mysql';
import { logger } from '../utils/logger';

export const client = mysql.createConnection({
  host     : process.env.MYSQL_HOST,
  user     : process.env.MYSQL_USER,
  password : process.env.MYSQL_PASSWORD,
  database : process.env.DATABASE
});

client.connect(err => {
    if (err) {
        logger.error(`MYSQL: ${err.stack}`);
        process.exit(1);
    }
     
    logger.info('MYSQL: Connected to the database!');
});

 
export function runQuery(query: string): Promise<mysql.MysqlError | any> {
    return new Promise((resolve, reject) => {
        client.query(query, function (error, results) {
            if (error) {
                reject(error);
            }

            resolve(results);
        });
    });
}