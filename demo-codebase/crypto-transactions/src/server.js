import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideCryptoTransaction } from "./decisionEngine.js";

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1024 * 1024;
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const STATIC_CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

export function createServer() {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "POST" && url.pathname === "/decisions/crypto-transaction") {
      try {
        const payload = await readJsonBody(request);
        const result = decideCryptoTransaction(payload);
        sendJson(response, result.permitted ? 200 : 422, result);
      } catch (error) {
        const statusCode = error.statusCode ?? 500;
        sendJson(response, statusCode, {
          permitted: false,
          decision: "DENY",
          reasons: [
            {
              code: error.code ?? "INTERNAL_ERROR",
              message: error.message
            }
          ]
        });
      }
      return;
    }

    if (request.method === "GET") {
      const served = await serveStatic(url.pathname, response);
      if (served) {
        return;
      }
    }

    sendJson(response, 404, {
      error: "Not found"
    });
  });
}

async function serveStatic(pathname, response) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestedPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    return false;
  }

  try {
    const contents = await fs.readFile(filePath);
    response.writeHead(200, {
      "content-type": STATIC_CONTENT_TYPES[path.extname(filePath)] ?? "application/octet-stream"
    });
    response.end(contents);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      const error = new Error("Request body exceeds 1MB.");
      error.statusCode = 413;
      error.code = "PAYLOAD_TOO_LARGE";
      throw error;
    }
  }

  try {
    return JSON.parse(body || "{}");
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    error.code = "INVALID_JSON";
    throw error;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json"
  });
  response.end(JSON.stringify(payload, null, 2));
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const port = Number.parseInt(process.env.PORT ?? `${DEFAULT_PORT}`, 10);
  createServer().listen(port, () => {
    console.log(`Crypto transaction decision API listening on http://localhost:${port}`);
  });
}
