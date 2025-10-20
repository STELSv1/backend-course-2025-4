const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const url = require('url');
const { program } = require('commander');
const { XMLBuilder } = require('fast-xml-parser');

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

const server = http.createServer(async (req, res) => {
  
  const parsedUrl = new url.URL(req.url, `http://${options.host}:${options.port}`);
  const queryParams = parsedUrl.searchParams;

  const showDate = queryParams.get('date') === 'true';
  const minAirtime = parseFloat(queryParams.get('airtime_min'));

  try {
    const fileData = await fsp.readFile(inputFilePath, 'utf8');
    const flights = JSON.parse(fileData);

    let filteredFlights = flights;

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
    console.error("Помилка обробки запиту:", err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущено та працює на http://${options.host}:${options.port}`);
});
