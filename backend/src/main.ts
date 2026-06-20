import { app } from './server/server';
import { config } from './utils/config';

async function bootstrap() {
  app.listen(config.port, () => {
    console.log(`\x1b[32m[INFO]\x1b[0m Backend server running on port ${config.port}`);
  });
}

bootstrap().catch(err => {
  console.error("Failed to start server", err);
  process.exit(1);
});
