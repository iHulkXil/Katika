import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import apiApp from "./artifacts/api-server/src/app";

const currentDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function resolveDistPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "artifacts/katika-bet/dist/public"),
    path.resolve(currentDir, "../artifacts/katika-bet/dist/public"),
    path.resolve(currentDir, "artifacts/katika-bet/dist/public"),
    path.resolve(currentDir, "public"),
    path.resolve(process.cwd(), "dist/public"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "artifacts/katika-bet/dist/public");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mount the Express API app
  app.use(apiApp);

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: path.resolve(currentDir, "artifacts/katika-bet/vite.config.ts"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = resolveDistPath();
    console.log(`Serving static files from ${distPath}`);
    app.use(express.static(distPath));
    app.get("*all", (_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Katika.Bet server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Katika.Bet server:", err);
  process.exit(1);
});
