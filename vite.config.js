import { defineConfig, loadEnv } from "vite";
import { api } from "./server/api.js";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.FDC_API_KEY) process.env.FDC_API_KEY = env.FDC_API_KEY;
  if (env.USDA_DB_PATH) process.env.USDA_DB_PATH = env.USDA_DB_PATH;
  return {
    plugins: [
      {
        name: "nourally-api",
        configureServer(server) {
          server.middlewares.use(api);
        },
        configurePreviewServer(server) {
          server.middlewares.use(api);
        },
      },
    ],
  };
});
