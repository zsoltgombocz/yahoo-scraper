import { NextFunction, Request, Response } from "express"
import moment from "moment";
export const formatDateMiddleware = ((req: Request, res: Response, next: NextFunction) => {
    const parentFunction = res.json;

    res.json = function (data): Response<any, Record<string, any>> {
        if (data.timestamp) {
            const unix = data.timestamp / 1000;
            data.timestamp = moment.unix(unix).locale('HU').format('LLLL');
            data.short_timestamp = moment.unix(unix).format('YYYY-MM-DD HH:mm');
        }

        return parentFunction.call(res, data);
    };

    next();
})