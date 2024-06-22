import mongoose from 'mongoose'
import { logger } from '../utils/logger';

export const connect = () => {
    mongoose.connect(process.env.MONGODB_URL ?? 'mongodb://localhost:27017')
    .then(
        () => logger.info('MONGODB: Connected to database.'),
        err => logger.error('MONGODB: Connection error: ', err)
    );
    
    mongoose.connection.on('error', err => {
        logger.error('MONGODB: ', err);
    });
}