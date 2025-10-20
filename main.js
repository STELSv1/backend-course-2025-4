const http = require('http');
const fs = require('fs');
const url = require('url');
const readline = require('readline');
const { program } = require('commander');
const { XMLBuilder } = require('fast-xml-parser');

async function readFlightsFile(filePath) {
  return new Promise((resolve, reject) => {
    const flights = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let counter = 0;

    rl.on('line', (line) => {
      if (counter >= 600) {
        rl.close();
        rl.removeAllListeners('line');
        return;
      }
      if (line.trim()) {
        try {
          flights.push(JSON.parse(line));
          counter++;
        } catch (e) {
          // ignore
        }
      }
    });

    rl.on('close', () => {
      resolve(flights);
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}

let allFlights = [];

async function main() {
  program
    .requiredOption('-i, --input <path>', "шлях до файлу")
    .requiredOption('-h, --host <address>', "адреса сервера")
    .requiredOption('-p, --port <port>', "порт сервера");

  program.parse(process.argv);
  const options = program.opts();
  const inputFilePath = options.input;

  if (!fs.existsSync(inputFilePath)) {
    console.error("Cannot find input file");
    process.exit(1);
  }

  try {
    console.log(`Читаємо дані з ${inputFilePath}... (Обмежено до 600 записів)`);
    allFlights = await readFlightsFile(inputFilePath);
    console.log(`Успішно завантажено ${allFlights.length} записів.`);
  } catch (err) {
    console.error("Не вдалося прочитати файл:", err);
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    const parsedUrl = new url.URL(req.url, `http://${options.host}:${options.port}`);
    const queryParams = parsedUrl.searchParams;

    const showDate = queryParams.get('date') === 'true';
    const minAirtime = parseFloat(queryParams.get('airtime_min'));

    try {
      let filteredFlights = allFlights;

      if (!isNaN(minAirtime)) {
        filteredFlights = filteredFlights.filter(f => f.AIR_TIME > minAirtime);
      }

      const formattedData = filteredFlights.map(f => {
        const flightRecord = {
          air_time: f.AIR_TIME,
          distance: f.DISTANCE
        };
        
        if (showDate) {
          flightRecord.date = f.FL_DATE;
        }
        
        return flightRecord;
      });

      const builder = new XMLBuilder({ 
        format: true,
        arrayNodeName: "flight"
      });
      
      const xmlObject = {
        flights: {
          flight: formattedData
        }
      };
      
      const xmlOutput = builder.build(xmlObject);

      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xmlOutput);

    } catch (err) {
      console.error("Помилка обробки:", err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено та працює на http://${options.host}:${options.port}`);
  });
}

main();
