// Development-only UI preview with disposable data; never included in the desktop bundle.
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os");
const { Store } = require("../src/store.cjs");
const folder = fs.mkdtempSync(path.join(os.tmpdir(), "symptopage-preview-"));
const store = new Store(path.join(folder, "records.json"));
const root = path.resolve(__dirname, "../ui");
const server = http.createServer(async (req, res) => {
  try {
    if (req.url === "/bridge.js") {
      res.setHeader("Content-Type", "application/javascript");
      res.end(
        `const request=async(path,body)=>{const r=await fetch(path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return r.json()};window.sympto={read:()=>request('/api/read'),change:(command,value)=>request('/api/change',{command,value}),exportPDF:async()=>({ok:true,value:false}),print:async()=>({ok:true,value:false}),showData:async()=>({ok:true})};`,
      );
      return;
    }
    if (req.url === "/api/read") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, value: store.read() }));
      return;
    }
    if (req.url === "/api/change" && req.method === "POST") {
      if (req.headers.origin !== "http://127.0.0.1:4317") throw Error("origin");
      let body = "";
      for await (const part of req) {
        body += part;
        if (body.length > 12000) throw Error("large");
      }
      const { command, value } = JSON.parse(body);
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ ok: true, value: store.apply(command, value) }));
      return;
    }
    const name = req.url === "/" ? "index.html" : req.url.slice(1);
    if (!["index.html", "style.css", "app.js", "i18n.js"].includes(name)) {
      res.writeHead(404);
      res.end();
      return;
    }
    let content = fs.readFileSync(path.join(root, name), "utf8");
    if (name === "index.html")
      content = content
        .replace("connect-src 'none'", "connect-src 'self'")
        .replace(
          '<script type="module"',
          '<script src="bridge.js"></script><script type="module"',
        );
    res.setHeader(
      "Content-Type",
      name.endsWith(".html")
        ? "text/html"
        : name.endsWith(".css")
          ? "text/css"
          : "application/javascript",
    );
    res.end(content);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "INVALID_DATA" }));
  }
});
server.listen(4317, "127.0.0.1", () =>
  console.log("Disposable UI preview: http://127.0.0.1:4317"),
);
const cleanup = () => {
  server.close();
  fs.rmSync(folder, { recursive: true, force: true });
  process.exit(0);
};
process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
