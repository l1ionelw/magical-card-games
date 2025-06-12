const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('Client connected');
    ws.send('Hello from server!');
    ws.on('message', msg => {
        console.log(`Received: ${msg}`);
    });
});

app.get('/', (req, res) => {
    res.send('WebSocket server is running!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
