import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

export default function globalSetup(): void {
  config({ path: resolve(__dirname, '../../.env.test') });

  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is missing. Copy .env.test.example to .env.test and ensure Postgres is running.',
    );
  }

  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env },
    stdio: 'inherit',
  });
}
