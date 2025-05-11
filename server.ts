import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { extname } from "https://deno.land/std@0.177.0/path/mod.ts";

const kv = await Deno.openKv();
const port = 8000;

const CONTENT_TYPES = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".json": "application/json"
};

async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // API endpoints
    if (url.pathname === "/api/records" && request.method === "GET") {
        return await getRecords();
    }

    if (url.pathname === "/api/records" && request.method === "POST") {
        return await addRecord(request);
    }

    // Static files
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    filePath = `./public${filePath}`;

    try {
        const file = await Deno.readFile(filePath);
        const ext = extname(filePath);
        const contentType = CONTENT_TYPES[ext] || "text/plain";

        return new Response(file, {
            headers: { "content-type": `${contentType}; charset=utf-8` },
        });
    } catch {
        return new Response("Not Found", { status: 404 });
    }
}

async function getRecords(): Promise<Response> {
    const records = [];
    for await (const entry of kv.list({ prefix: ["records"] })) {
        records.push(entry.value);
    }

    records.sort((a, b) => a.time - b.time);

    return new Response(JSON.stringify(records), {
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

async function addRecord(request: Request): Promise<Response> {
    try {
        const data = await request.json();
        const { name, score, time } = data;

        if (!name || score === undefined || time === undefined) {
            return new Response("Missing data", { status: 400 });
        }

        const record = {
            name: name.substring(0, 20),
            score: Math.max(0, Math.min(Number(score), 9999)),
            time: Math.max(0, Number(time)),
            date: new Date().toISOString(),
        };

        await kv.set(["records", Date.now()], record);

        return new Response(JSON.stringify(record), {
            status: 201,
            headers: { "content-type": "application/json; charset=utf-8" },
        });
    } catch (error) {
        return new Response(error.message, { status: 500 });
    }
}

console.log(`Server running at http://localhost:${port}`);
serve(handleRequest, { port });