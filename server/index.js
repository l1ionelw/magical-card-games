const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const cors = require('cors')
const { resolve } = require("node:path");

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
    res.redirect("/egyptian-war/");
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
// app.get('/debug/get-all-lobbies', (req, res) => {
//     const sanitizedLobbies = lobbies.map(lobby => ({
//         ...lobby,
//         players: lobby.players.map(player => ({
//             display_name: player.display_name,
//             ip: player.ip
//         }))
//     }));
//     return res.json(sanitizedLobbies);
// });



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
            console.log("Data received from lobby host: ");
            console.log(data);
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
    let displayName = "";
    let lobbyId = -1;
    console.log("user of ip: " + userIP + " wants to join lobby");
    ws.on('message', (message) => {
        const joinInfo = JSON.parse(message);
        console.log(joinInfo);
        if (!joinInfo || !joinInfo.lobbyId || !joinInfo.displayName) {
            ws.send(JSON.stringify({ type: 'error', message: 'Request not valid' }));
            return;
        }
        const lobby = lobbies.find(l => l.id === parseInt(joinInfo.lobbyId));
        if (!lobby) {
            ws.send(JSON.stringify({ type: 'error', message: 'Lobby not found' }));
            return;
        }

        if (lobby.state !== 'waiting') {
            ws.send(JSON.stringify({ type: 'error', message: 'Game already in progress' }));
            return;
        }

        // 🚫 Check for duplicate display name
        const existingPlayer = lobby.players.find(player => player.display_name === joinInfo.displayName);
        if (existingPlayer) {
            ws.send(JSON.stringify({ type: 'error', message: 'Display name already taken in this lobby' }));
            return;
        }

        displayName = joinInfo.displayName;
        lobbyId = joinInfo.lobbyId;

        lobby.players.push({
            display_name: joinInfo.displayName,
            ip: userIP,
            websocket: ws
        });

        // ✅ Notify all players in the lobby
        lobby.players.forEach(player => {
            player.websocket.send(JSON.stringify({
                type: 'player_joined',
                playerDisplayName: joinInfo.displayName,
                players: lobby.players.map(p => ({ display_name: p.display_name }))
            }));
        });

        // ❌ Handle player disconnection
        ws.on("close", () => {
            console.log(`he left the lobby`);
            console.log(`Removed player '${displayName}' from lobby ${lobbyId}`);
            lobby.players = lobby.players.filter(player => player.display_name !== displayName);

            lobby.players.forEach(player => {
                player.websocket.send(JSON.stringify({
                    type: 'player_left',
                    playerDisplayName: joinInfo.displayName,
                    players: lobby.players.map(p => ({ display_name: p.display_name }))
                }));
            });
        });
    });

});
app.ws('/start-game', (ws, req) => {
    const ip = getUserIP(req);
    console.log(ip);
    console.log("starting game for lobby: ");
    ws.on('message', (message) => {
        // {lobbyId: "2"}
        const lobbyDetails = JSON.parse(message);
        console.log(lobbyDetails);
        if (!lobbyDetails || !lobbyDetails.lobbyId) {
            ws.send(JSON.stringify({ type: 'error', message: 'Request not valid' }));
            return;
        }
        // send ws to everyone to start game 
        const lobby = lobbies.find(lobby => lobby.id == lobbyDetails.lobbyId);
        console.log("lobby to start: ");
        console.log(lobby);
        lobby.players.forEach(player => {
            player.websocket.send(JSON.stringify({
                type: 'start_game',
            }));
        });
    });
});
app.ws('/register-ingame', (ws, req) => {
    let lobbyId;
    let lobby;
    // on message, check if action == "send_game_lobby" if so then send the game lobby
    ws.on('message', (message) => {
        let parsed = JSON.parse(message);
        console.log(parsed);
        if (!parsed.action) {
            ws.send(JSON.stringify({ type: 'error', message: 'Request not valid' }));
            return;
        }
        if (parsed.action === "sendLobbyId") {
            lobbyId = parsed.lobbyId;
            lobby = lobbies.find(lobby => lobby.id == lobbyId);
            // each client will send this, so for each of them, get their username and update their websocket so that it sends to js handler
            let player = lobby.players.find(player => player.display_name === parsed.display_name);
            console.log("found this player: " + player);
            player.websocket = ws;
            let cardsShuffled = distributeCards(lobby.players.length);
            let card_amounts = cardsShuffled.map(cardList => cardList.length);
            // send back for each player in the lobby, the index for their card
            for (let index in cardsShuffled) {
                lobby.players[index].websocket.send(JSON.stringify({ action: "distribute_cards", cards: cardsShuffled[index], card_amounts: card_amounts }));
            }
            return;
        }
        if (!lobby) { console.log("no lobby"); return; };
        console.log("sending the message to all other players in REGSIRTER GAM");
        console.log(lobby);
        console.log(lobby.players);
        // otherwise, replay the message to all other players
        lobby.players.forEach(player => {
            player.websocket.send(message);
        });
    });
});
function distributeCards(peopleToSplitInto) {
    // return list in list for amount of people
    // Create a standard 52-card deck
    console.log("distributing among: " + peopleToSplitInto + " players");
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];

    // Generate all cards
    const deck = [];
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push(`${rank}_of_${suit}`);
        }
    }
    // deck.forEach(card => {
    //     console.log(card);
    // });
    console.log(deck.length);

    // Shuffle the deck using Fisher-Yates algorithm
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    // Initialize hands for each person
    const hands = Array.from({ length: peopleToSplitInto }, () => []);

    // Distribute cards evenly (round-robin style)
    for (let i = 0; i < deck.length; i++) {
        const personIndex = i % peopleToSplitInto;
        hands[personIndex].push(deck[i]);
    }

    return hands;
}

// 404 handler
app.use((req, res, next) => {
    res.status(404).send('Sorry, page not found!');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}/`);
});