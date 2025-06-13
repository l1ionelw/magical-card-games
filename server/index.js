const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const cors = require('cors')
const {resolve} = require("node:path");

// Middleware for parsing JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors());
app.use(express.static('pages'));

const lobbies = {}
/*
Lobbies Data
{
    id: <lobby id, sequential>
    players: [
        {
            display_name: <display_name>
            ip: ipaddress (for reconnecting)
            websocket_id: websocket id
        }
    ]
    join_link: "domain.com/join/<lobbyid>"
}

IpAddresses Data, used for reconnecting, that way get ip and can search through this array, and then find in Lobbies array
[<ip>: "<gameId>]
 */


// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.get('/egyptian-war/', (req, res) => {
    res.sendFile(resolve("egyptian-war/index.html"));
});
// 404 handler
app.use((req, res, next) => {
    res.status(404).send('Sorry, page not found!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
});