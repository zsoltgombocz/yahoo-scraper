const winston = require("winston");

const customFormat: string = winston.format.printf((data: any) => {
  return `${data.timestamp} - ${data.message}`;
});

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    customFormat
  ),
  transports: [
    new winston.transports.File({
      filename: 'log/info.log',
      level: 'info'
    })
  ],
});