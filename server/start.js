import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";
import { api } from "./api.js";
const root = resolve("dist");
if (!existsSync(root))
  throw new Error("Run npm run build before starting the app.");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
};
createServer((req, res) =>
  api(req, res, () => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405);
      res.end();
      return;
    }
    let path;
    try {
      path = resolve(
        root,
        `.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`,
      );
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    if (path !== root && !path.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (path === root || path === root + sep)
      path = resolve(root, "index.html");
    if (!existsSync(path) || !statSync(path).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[extname(path)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "Cache-Control":
        extname(path) === ".html" ? "no-cache" : "public, max-age=3600",
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(path).pipe(res);
  }),
).listen(
  Number(process.env.PORT) || 4173,
  process.env.HOST || "127.0.0.1",
  () =>
    console.log(
      `Nourally listening on http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 4173}`,
    ),
);
