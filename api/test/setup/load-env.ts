import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Loads `.env.test` from the api package root before any other test setup runs.
 */
config({ path: resolve(__dirname, '../../.env.test') });
