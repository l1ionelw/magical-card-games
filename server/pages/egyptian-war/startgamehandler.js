let gameWs;
let canvas;
let ctx;
let current_deck = [];
let current_deck_stack = [];
let card_amounts = [];
let special_card_curriter = 0;
let special_card_maxiter = 0;
// set current turn index to the 0th index, assuming everyone's players list is the same order
let currentTurnIndex = 0;

// go by players order (by index), then wait for server response of a card and update state accordingly
function startGameHandler() {
    console.log("STARTING GAME HANDLER innewfile");

    // Clear the page and set up the game layout
    document.querySelector("body").innerHTML = `
        <div id="game-container">
            <canvas id="game-canvas"></canvas>
            <div id="bottom-bar">
                <div id="left-buttons">
                    <button id="slam-btn" class="game-btn">Slam</button>
                    <button id="place-card-btn" class="game-btn">Place Card</button>
                </div>
                <div id="right-buttons">
                    <button id="leave-game-btn" class="game-btn leave-btn">Leave Game</button>
                </div>
            </div>
        </div>
    `;

    // Add CSS styles
    const style = document.createElement("style");
    style.textContent = `
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            overflow: hidden;
        }
        
        #game-container {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background: #2c3e50;
        }
        
        #game-canvas {
            flex: 1;
            background: #34495e;
            border: none;
        }
        
        #bottom-bar {
            height: 80px;
            background: #1a252f;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0 20px;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
        }
        
        #left-buttons, #right-buttons {
            display: flex;
            gap: 15px;
        }
        
        .game-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        #slam-btn, #place-card-btn {
            background: #3498db;
            color: white;
        }
        
        #slam-btn:hover, #place-card-btn:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        
        .leave-btn {
            background: #e74c3c;
            color: white;
        }
        
        .leave-btn:hover {
            background: #c0392b;
            transform: translateY(-2px);
        }
        
        .game-btn:active {
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);

    // Get canvas and set it up to fill the available space
    canvas = document.getElementById("game-canvas");
    const resizeCanvas = () => {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    };

    // Initial resize and add resize listener
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Add event listeners for buttons
    document.getElementById("slam-btn").addEventListener("click", handleSlam);

    document.getElementById("place-card-btn").addEventListener("click", handlePlaceCard);

    document.getElementById("leave-game-btn").addEventListener("click", handleLeaveGame);

    console.log("STARTING WITH THESE PLAYERS:");
    console.log(players);
    console.log('USING THIS LOBBY ID: ' + LOBBY_ID);
    setupCanvasRenderer();
    initialRender();
}

function updateCurrentTurn() {
    if (players.length === 0) return;

    currentTurnIndex = (currentTurnIndex + 1) % players.length;
    const currentPlayer = players[currentTurnIndex];

    console.log(`It's now ${currentPlayer.display_name}'s turn`);
    return currentPlayer;
}

function setupGameWebsockets() {
    console.log("infile - setup game websockets");
    /*
      send commands (also received by client): 
      {action: "place_card"} // server determines value + gamestate
      {action: "slam"}
      */
    gameWs = new WebSocket(`ws://${window.location.host}/register-ingame`);
    gameWs.onopen = function () {
        console.log("websocket connected, sending lobby id and username");
        gameWs.send(JSON.stringify({ action: "sendLobbyId", lobbyId: LOBBY_ID, display_name: username }))
    }

    gameWs.onmessage = function (event) {
        // handler functions from server
        console.log(event);
        const data = JSON.parse(event.data);
        console.log("Parsed game data IN GAME WS:", data);

        if (data.action === "distribute_cards") {
            current_deck = data.cards;
            card_amounts = data.card_amounts;
            console.log("HERES THE DECK!!!");
            console.log(current_deck);
            renderPlayers({renderNames: true});
        }
        if (data.action === "slam") {
            /* 
            default rules - 
            - sandwich with first card or card in between
            - normal sandwich
            - if current card on deck is king, queen, or jack, check card count, then make player insert a card at the bottom
            */
           // is sandwich whole deck or sandwich last last card or equal to previous card?
           if (data.card === current_deck_stack[0] || data.card === )

           // check is special card?
           if (special_card_curriter !== 0) { console.log("slammed while there's a special card!") }
            renderPlayers({renderNames: true});
        }
        if (data.action === "place_card") {
            /*
            handle somsone else placed card
            get the card, and add it to card list 
            update the other player's cards too
            handle next turn

            - check if last user placed card is king, queen, or jack, if so, set special card maxiter to 1,2,or3 and special card curr iter to 0
            - if inSpecialCardLock (special card maxiter is not 0), then process this request with those rules (check did they place special card, or num iters passed max iter)
            - if not, then process place card normal (alr done)
            */
            current_deck_stack.push(data.card);
            card_amounts[currentTurnIndex] -= 1;
            updateCurrentTurn();
            renderPlayers({renderNames: true});
        }
    };
}

function handleSlam() {
    console.log("slam pressed");
    gameWs.send(JSON.stringify({ action: "slam" }));
}

function handlePlaceCard() {
    console.log("place card pressed");
    // get index of my username
    let myIndex;
    for (myIndex=0;myIndex<players.length; myIndex++) {
        if (players[myIndex].display_name === username) {
            break;
        }
    }
    console.log("current player index: ");
    if (currentTurnIndex !== myIndex) {
        console.log("is not my turn, will not place card");
        return;
    }
    // place the card operation
    console.log("placing card!");
    // pop from card deck and add to current deck
    const card = current_deck.pop();
    gameWs.send(JSON.stringify({ action: "place_card", card: card })); // only send, the ws handler will put on current card deck
    
}

function handleLeaveGame() {
    console.log("leave game pressed");
    // do nothing, websocket will auto disconnect
    // TODO: handle disconnect gracefully inside lobby and join-lobby html files
}

function setupCanvasRenderer() {
    // assumes canvas variable is initialized from startGameHandler function
    console.log("setting up canvas renderer");
    if (canvas.getContext) {
        ctx = canvas.getContext("2d");
    } else {
        document.getElement("body").innerHTML = "<h1>Game unsupported</h1><p>The Canvas API is unsupported on this browser, please update to a newer version or switch to a new browser</p>"
    }
}
function initialRender() {
    renderPlayers();
}

function renderPlayers({ renderNames = true } = {}) {
    players.forEach((player, index) => {
        const yPosition = (canvas.height * 0.5) + (index * 40);
        const circleX = canvas.width * 0.1;
        const radius = 15;
        const textX = circleX + radius + 10;

        // Clear the whole player area (circle + name + dot)
        ctx.clearRect(circleX - radius - 10, yPosition - radius - 5, canvas.width, radius * 2 + 10);

        // Re-draw circle with current number
        renderPlayerCircle(ctx, circleX, yPosition, card_amounts[index]);
        

        // Render name and turn indicator if requested
        if (renderNames) {
            renderPlayerName(ctx, textX, yPosition, player.display_name);

            // 🟢 Draw green dot if it's this player's turn
            if (index === currentTurnIndex) {
                renderTurnIndicator(ctx, textX - 15, yPosition); // position dot to the left of name
            }
        }
    });
}
function renderTurnIndicator(ctx, x, y) {
    const dotRadius = 6;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fillStyle = "limegreen"; // Bright green
    ctx.fill();
    ctx.closePath();
}

function renderPlayerCircle(ctx, x, y, number) {
    const radius = 15;

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#007BFF"; // Blue fill
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#FFFFFF";
    ctx.stroke();
    ctx.closePath();

    // Draw number inside circle
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(number, x, y);
    
}

function renderPlayerName(ctx, x, y, name) {
    ctx.font = "16px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(name, x, y);
}
