const http = require('http');
const fs = require('fs');
const { program } = require('commander');

program
  .requiredOption('-i, --input <path>', "шлях до файлу, який даємо для читання")
  .requiredOption('-h, --host <address>', "адреса сервера")
  .requiredOption('-p, --port <port>', "порт сервера");

program.parse(process.argv);

const options = program.opts();
const inputFilePath = options.input;

if (!fs.existsSync(inputFilePath)) {
  console.error("Cannot find input file");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running, logic for Part 2 is pending.');
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено та працює на http://${options.host}:${options.port}`);
});
