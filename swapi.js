const http = require("http");
const https = require("https");

// Constants
const DEFAULT_PORT = 3000;
const API_BASE_URL = "https://swapi.dev/api/";
const DEFAULT_TIMEOUT = 5000;
const ERROR_STATUS = 400;
const SUCCESS_STATUS = 200;
const NOT_FOUND_STATUS = 404;
const MAX_ID = 4;
const MAX_STARSHIPS = 3;
const MIN_POPULATION = 1000000000;
const MIN_DIAMETER = 10000;
const ARG_SLICE_INDEX = 2;
const INVALID_INDEX = -1;

// State
const cache = {};
const stats = { errorCount: 0, fetchCount: 0, dataSize: 0 };
const config = { debug: true, timeout: DEFAULT_TIMEOUT };
let lastCharacterId = 1;

// Logging
function logDebug(message) {
    if (config.debug) console.log(message);
}

// Fetch data
async function fetchData(endpoint) {
    if (cache[endpoint]) {
        logDebug(`Cache hit: ${endpoint}`);
        return cache[endpoint];
    }

    return new Promise((resolve, reject) => {
        const data = "";
        const url = `${API_BASE_URL}${endpoint}`;

        const request = https.get(url, { rejectUnauthorized: false }, (res) => {
            handleResponse({ res, endpoint, resolve, reject, data });
        }).on("error", (err) => {
            stats.errorCount++;
            reject(new Error(`Request error for ${endpoint}: ${err.message}`));
        });

        request.setTimeout(config.timeout, () => {
            request.abort();
            stats.errorCount++;
            reject(new Error(`Timeout for ${endpoint}`));
        });
    });
}

function handleResponse({ res, endpoint, resolve, reject, data }) {
    if (res.statusCode >= ERROR_STATUS) {
        stats.errorCount++;
        return reject(new Error(`HTTP Error ${res.statusCode} for ${endpoint}`));
    }
    res.on("data", chunk => { data += chunk; });
    res.on("end", () => {
        try {
            const parsed = JSON.parse(data);
            cache[endpoint] = parsed;
            resolve(parsed);
            logDebug(`Fetched: ${endpoint}`);
        } catch (err) {
            stats.errorCount++;
            reject(new Error(`Parse error for ${endpoint}: ${err.message}`));
        }
    });
    return undefined;
}

// Display functions
function printCharacter(character) {
    stats.dataSize += JSON.stringify(character).length;
    console.log(`\nCharacter: ${character.name}`);
    console.log(`Height: ${character.height}`);
    console.log(`Mass: ${character.mass}`);
    console.log(`Birth year: ${character.birth_year}`);
    console.log(`Films: ${character.films.length}`);
}

function printStarships(starships) {
    stats.dataSize += JSON.stringify(starships).length;
    console.log(`\nStarships (${starships.count} total):`);
    starships.results.slice(0, MAX_STARSHIPS).forEach((ship, idx) => {
        console.log(`\nStarship ${idx + 1}:`);
        console.log(`Name: ${ship.name}`);
        console.log(`Model: ${ship.model}`);
        console.log(`Manufacturer: ${ship.manufacturer}`);
        console.log(`Cost: ${ship.cost_in_credits}`);
    });
}

function printPlanets(planets) {
    stats.dataSize += JSON.stringify(planets).length;
    console.log("\nLarge populated planets:");
    planets.results
        .filter(p => parseInt(p.population, 10) > MIN_POPULATION &&
                     parseInt(p.diameter, 10) > MIN_DIAMETER)
        .forEach(p => console.log(`${p.name} - Pop: ${p.population}, ` +
            `Diameter: ${p.diameter}, Climate: ${p.climate}`));
}

function printFilms(films) {
    stats.dataSize += JSON.stringify(films).length;
    console.log("\nFilms:");
    films.results
        .sort((a, b) => new Date(a.release_date) - new Date(b.release_date))
        .forEach((film, idx) => console.log(`${idx + 1}. ${film.title} (${film.release_date})`));
}

function printVehicle(vehicle) {
    stats.dataSize += JSON.stringify(vehicle).length;
    console.log(`\nVehicle: ${vehicle.name}`);
    console.log(`Model: ${vehicle.model}`);
    console.log(`Manufacturer: ${vehicle.manufacturer}`);
}

// Main handler
async function handleStarWarsData() {
    try {
        stats.fetchCount++;
        logDebug("Starting data fetch...");

        const character = await fetchData(`people/${lastCharacterId}`);
        printCharacter(character);

        const starships = await fetchData("starships/?page=1");
        printStarships(starships);

        const planets = await fetchData("planets/?page=1");
        printPlanets(planets);

        const films = await fetchData("films/");
        printFilms(films);

        if (lastCharacterId <= MAX_ID) {
            const vehicle = await fetchData(`vehicles/${lastCharacterId}`);
            printVehicle(vehicle);
            lastCharacterId++;
        }

        printStats();
    } catch (err) {
        console.error(`Error: ${err.message}`);
        stats.errorCount++;
    }
}

function printStats() {
    if (!config.debug) return;
    console.log(`\nStats: Fetches: ${stats.fetchCount}, ` +
        `Cache: ${Object.keys(cache).length}, ` +
        `DataSize: ${stats.dataSize}, Errors: ${stats.errorCount}`);
}

// Server
function createServer() {
    return http.createServer((req, res) => {
        if (req.url === "/" || req.url === "/index.html") {
            serveHtml(res);
        } else if (req.url === "/api") {
            handleStarWarsData();
            res.writeHead(SUCCESS_STATUS, { "Content-Type": "text/plain" });
            res.end("Check server console for results");
        } else if (req.url === "/stats") {
            serveStats(res);
        } else {
            res.writeHead(NOT_FOUND_STATUS, { "Content-Type": "text/plain" });
            res.end("Not Found");
        }
    });
}

function serveHtml(res) {
    res.writeHead(SUCCESS_STATUS, { "Content-Type": "text/html" });
    res.end(generateHtml());
}

function generateHtml() {
    return `
        <!DOCTYPE html>
        <html>
            <head>
                <title>Star Wars API Demo</title>
                <style>
                    body { font-family: Arial; max-width: 800px; margin: auto; padding: 20px; }
                    h1 { color: #FFE81F; background: #000; padding: 10px; }
                    button { background: #FFE81F; border: none; padding: 10px 20px; cursor: pointer; }
                </style>
            </head>
            <body>
                <h1>Star Wars API Demo</h1>
                <p>Check console for results.</p>
                <button onclick="fetchData()">Fetch Data</button>
                <script>
                    function fetchData() {
                        fetch("/api").then(() => alert("Data fetched. Check console."));
                    }
                </script>
            </body>
        </html>
    `;
}

function serveStats(res) {
    res.writeHead(SUCCESS_STATUS, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...stats, cache: Object.keys(cache).length,
        debug: config.debug, timeout: config.timeout }));
}

// CLI args
const args = process.argv.slice(ARG_SLICE_INDEX);
if (args.includes("--no-debug")) config.debug = false;
if (args.includes("--timeout")) {
    const idx = args.indexOf("--timeout");
    if (idx !== INVALID_INDEX && args[idx + 1]) config.timeout = parseInt(args[idx + 1], 10);
}

// Start
createServer().listen(process.env.PORT || DEFAULT_PORT, () => {
    console.log(
        `Server at http://localhost:${process.env.PORT || DEFAULT_PORT}/`
    );
});

