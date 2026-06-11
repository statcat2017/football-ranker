/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = parseInt(process.env.PORT ?? "3000", 10);
const hostname = process.env.HOSTNAME ?? "localhost";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  }).listen(port);

  console.log(`Football Ranker listening on http://${hostname}:${port}`);
});
