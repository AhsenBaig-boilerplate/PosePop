// Local preview of dist/ with the same caching rules the app is designed for:
// hashed assets are immutable, index.html and version.json are always revalidated.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT || 8080);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json", ".txt": "text/plain",
  ".svg": "image/svg+xml", ".woff2": "font/woff2" };

createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end("Bad request"); return; }
  const file = normalize(join(dist, path.endsWith("/") ? path + "index.html" : path));
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    const hashed = /\.[0-9a-f]{12}\.[a-z0-9]+$/.test(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream",
      "Cache-Control": hashed ? "public, max-age=31536000, immutable" : "no-cache", "X-Content-Type-Options": "nosniff" });
    res.end(body);
  } catch { res.writeHead(404).end("Not found"); }
}).listen(port, () => console.log(`PosePop preview on http://localhost:${port}`));
