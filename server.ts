import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { extname } from "https://deno.land/std@0.177.0/path/mod.ts";

// Открываем KV базу данных
const kv = await Deno.openKv();

const port = 8000;

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  
  // Обработка API для рекордов
  if (url.pathname === "/api/records" && request.method === "GET") {
    return await getRecords();
  }
  
  if (url.pathname === "/api/records" && request.method === "POST") {
    return await addRecord(request);
  }
  
  // Статические файлы
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = `./public${filePath}`;
  
  try {
    const file = await Deno.readTextFile(filePath);
    const contentType = `${getContentType(extname(filePath))}; charset=utf-8`;
    
    return new Response(file, {
      headers: { 
        "content-type": contentType,
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

// Получение рекордов
async function getRecords(): Promise<Response> {
  const records = [];
  for await (const entry of kv.list({ prefix: ["records"] })) {
    records.push(entry.value);
  }
  
  // Сортируем по времени (меньше время - лучше)
  records.sort((a, b) => a.time - b.time);
  
  return new Response(JSON.stringify(records), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// Добавление рекорда
async function addRecord(request: Request): Promise<Response> {
  try {
    const data = await request.json();
    const { name, score, time } = data;
    
    if (!name || !score || !time) {
      return new Response("Missing data", { status: 400 });
    }
    
    const record = {
      name,
      score: Number(score),
      time: Number(time),
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

function getContentType(ext: string): string {
  switch (ext) {
    case ".html": return "text/html";
    case ".js": return "application/javascript";
    case ".css": return "text/css";
    default: return "text/plain";
  }
}

console.log(`Server running at http://localhost:${port}`);
serve(handleRequest, { port });