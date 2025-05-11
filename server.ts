// server.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { extname } from "https://deno.land/std@0.177.0/path/mod.ts";

const port = 8000;

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  filePath = `./public${filePath}`;

  try {
    const file = await Deno.readFile(filePath);
    const contentType = getContentType(extname(filePath));
    return new Response(file, {
      headers: { "content-type": contentType },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
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