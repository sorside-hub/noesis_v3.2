import { handleDistil } from './src/api-core/distilHandler';

async function run() {
  const envObj = {
    GEMINI_FEATURE_PRIMARY_KEY: process.env.GEMINI_API_KEY
  };
  const result = await handleDistil("Hello this is a test text to distill", undefined, envObj);
  console.log("Success:", result.success);
}
run();
