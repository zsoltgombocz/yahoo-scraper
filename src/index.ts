import app from "./api";
import { client } from "./redis/client";
import { logger } from "./utils/logger";

const PORT = process.env.APP_PORT || 3000;

try {
    app.listen(PORT, async (): Promise<void> => {
        logger.info(`API: Application running on port: ${PORT}`);

        await client.connect();
    });
} catch (error: any) {
    logger.error(`API: ${error.message}`);
}
   