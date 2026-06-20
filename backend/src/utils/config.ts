import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  maxSteps: parseInt(process.env.MAX_STEPS || '20', 10),
  port: parseInt(process.env.PORT || '3000', 10),
  headlessBrowser: process.env.HEADLESS_BROWSER !== 'false',
  modelId: process.env.MODEL_ID || 'openai/gpt-oss-120b:free',
  visionModelId: process.env.VISION_MODEL_ID || 'nvidia/nemotron-nano-12b-v2-vl:free',
};

if (!config.openRouterApiKey) {
  console.warn('WARNING: OPENROUTER_API_KEY is not set in environment variables.');
}
