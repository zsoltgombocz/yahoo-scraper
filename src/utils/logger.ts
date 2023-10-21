import 'dotenv/config';
const winston = require("winston");

const customFormat: string = winston.format.printf((data: any) => {
  return `${data.timestamp} - ${data.message}`;
});

const getTransports = (): any[] => {
  const transports = [];

  transports.push(
    new winston.transports.File({
      filename: 'log/info.log',
      level: 'info'
    })
  );

  if (process.env.NODE_ENV !== 'production') {
    transports.push(new winston.transports.Console());
  }

  return transports;
}

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: getTransports(),
});