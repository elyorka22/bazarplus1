import { disconnectTestPrisma } from '../helpers/reset-database';

afterAll(async () => {
  await disconnectTestPrisma();
});
