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

const lobbies = []
/*
Lobbies Data
{
    id: <lobby id, sequential>
    state: "waiting" | "playing"
    players: [
        {
            display_name: <display_name>
            ip: ipaddress (for reconnecting)
            websocket: <websocket object>
        }
    ]
    join_link: "domain.com/join/<lobbyid>"
}

 */

// utility functions
function getUserIP(req) {
    // Get user's public IP address
    return req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

// Routes
app.get('/', (req, res) => {
    res.send('Hello World!');
});
app.get('/egyptian-war/', (req, res) => {
    res.sendFile(resolve("egyptian-war/index.html"));
});
app.get('/egyptian-war/lobby/', (req, res) => {
    res.sendFile(resolve("pages/egyptian-war/lobby.html"));
});
app.get('/egyptian-war/join/:id', (req, res) => {
    res.sendFile(resolve("pages/egyptian-war/join-lobby.html"));
});
app.get('/debug/get-all-lobbies', (req, res) => {
    const sanitizedLobbies = lobbies.map(lobby => ({
        ...lobby,
        players: lobby.players.map(player => ({
            display_name: player.display_name,
            ip: player.ip
        }))
    }));
    return res.json(sanitizedLobbies);
});



// websockets
app.ws('/create-lobby', (ws, req) => {
    const userIP = getUserIP(req);
    // create the lobby number right now
    const thisLobbyId = lobbies.length > 0 ? (parseInt(lobbies[lobbies.length - 1].id) + 1) : 1;
    console.log(`New connection from ${userIP}`);
    console.log("Will create a new lobby with id: " + thisLobbyId);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            /*
            {action: "create_lobby", display_name: "example player"}
             */
            console.log("Data received from lobby host: " + data);
            if (data.action === 'create_lobby' && data.display_name) {
                // Create new lobby
                const thisLobby = {
                    id: thisLobbyId,
                    state: "waiting",
                    players: [{
                        display_name: data.display_name,
                        ip: userIP,
                        websocket: ws
                    }],
                    join_link: `/join/${thisLobbyId}`
                }
                lobbies.push(thisLobby);
                console.log("Lobby created!");
                console.log(thisLobby);
                
                // Send lobby info back to client
                ws.send(JSON.stringify({
                    type: 'lobby_created',
                    lobby_id: thisLobbyId,
                    join_link: `/join/${thisLobbyId}`,
                    players: [{ display_name: data.display_name }]
                }));
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log(userIP + " disconnected");
        // find the lobby with that id, and delete it if it exists
        const lobbyIndex = lobbies.findIndex(lobby => lobby.id === thisLobbyId);
        if (lobbyIndex !== -1) {
            lobbies.splice(lobbyIndex, 1);
        }
    });
});
app.ws('/join-lobby', (ws, req) => {
    const userIP = getUserIP(req);
    console.log("user of ip: " + userIP + " wants to join lobby");
    ws.on('message', (message) => {
        // {lobbyId: "5", displayName: "example player"}
        console.log("details of the lobby user wants to join: ");
        const joinInfo = JSON.parse(message);
        console.log(joinInfo);
        if (!joinInfo || !joinInfo.lobbyId || !joinInfo.displayName) {
            ws.send(JSON.stringify({type: 'error', message: 'Request not valid'}));
            return;
        }
        const lobby = lobbies.find(l => l.id === parseInt(joinInfo.lobbyId));
        if (!lobby) {
            ws.send(JSON.stringify({type: 'error', message: 'Lobby not found'}));
            return;
        }

        if (lobby.state !== 'waiting') {
            ws.send(JSON.stringify({type: 'error', message: 'Game already in progress'}));
            return;
        }

        lobby.players.push({
            display_name: joinInfo.displayName,
            ip: userIP,
            websocket: ws
        });

        // Notify all players in the lobby
        lobby.players.forEach(player => {
            player.websocket.send(JSON.stringify({
                type: 'player_joined',
                playerDisplayName: joinInfo.displayName,
                players: lobby.players.map(p => ({display_name: p.display_name}))
            }));
        });
    })
})

// 404 handler
app.use((req, res, next) => {
    res.status(404).send('Sorry, page not found!');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
});