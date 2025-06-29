let gameWs;
let canvas;
let ctx;
let current_deck = [];
let current_deck_stack = [];
let card_amounts = [];
let special_card_curriter = 0;
let special_card_maxiter = 0;
let slammed_player_index = -1;
// set current turn index to the 0th index, assuming everyone's players list is the same order
let currentTurnIndex = 0;
let canPlace = true;

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

    // create keybinds
    document.addEventListener('keydown', function (event) {
        // Check if the 'q' key was pressed
        if (event.key === 'q') document.getElementById('slam-btn').click()
        if (event.key === 'w') document.getElementById('place-card-btn').click()
    });
}

function updateCurrentTurn() {
    if (players.length === 0) return;
    // if (special_card_curriter < special_card_maxiter) return;

    currentTurnIndex = (currentTurnIndex + 1) % players.length;
    const currentPlayer = players[currentTurnIndex];

    console.log(`It's now ${currentPlayer.display_name}'s turn`);
    return currentPlayer;
}

function getCardMetadata(currentCard) {
    const categoryPart = currentCard.split("_")[2];
    const numberPart = !isNaN(parseInt(currentCard.split("_")[0])) ? parseInt(currentCard.split("_")[0]) : currentCard.split("_")[0];
    const isNumber = !isNaN(parseInt(numberPart)); // true if it's a number card
    let hitCount = 0;
    if (!isNumber) {
        if (numberPart === "jack") hitCount = 1;
        if (numberPart === "king") hitCount = 3;
        if (numberPart === "queen") hitCount = 2;
        if (numberPart === "ace") hitCount = 4;
    }

    const card_metadata = {
        number: numberPart,
        type: isNumber ? "number" : "special", // "special" includes ace, jack, queen, king
        category: categoryPart,
        isNumber: isNumber,
        hitCount: hitCount
    };
    return card_metadata;
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
            renderPlayers({ renderNames: true });
        }
        if (data.action === "slam") {
            // get index of person who slammed so i can add to their counter
            if (data.type === "past_lock") {
                console.log("index of the slammer is: " + slammed_player_index);
                card_amounts[slammed_player_index] += current_deck_stack.length;
            }
            if (data.type === "normal") {
                const indexOfSlammer = players.findIndex(player => player.display_name === data.display_name);
                console.log("index of the slammer is: " + indexOfSlammer);
                card_amounts[indexOfSlammer] += current_deck_stack.length;
            }

            if (data.display_name === username) {
                // im the one who slammed, gonna take all cards and empty deck
                while (current_deck_stack.length !== 0) {
                    current_deck.push(current_deck_stack.pop());
                }
            } else {
                // i didnt slam, so im just gonna empty card deck and update card amounts
                current_deck_stack = [];
            }
            renderPlayers({ renderNames: true });
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


            // if is in lock, and put normal card
            const card_metadata = getCardMetadata(data.card);
            if (special_card_curriter < special_card_maxiter && card_metadata.type !== "special") {
                console.log("was in lock, put normal card");
                special_card_curriter++;
                // check if its past its alloted iterations
                if (special_card_curriter >= special_card_maxiter) {
                    canPlace = false;
                    special_card_maxiter = 0;
                    special_card_curriter = 0;
                    // get previous guys name, put into display_name
                    // TODO: fix this, the prev_player_index calc is wrong and websocket all players are sending to server
                    console.log("lost this game, giving cards to: " + players[slammed_player_index].display_name);
                    renderPlayers({ renderNames: true, cardName: data.card });
                    setTimeout(() => {
                        canPlace = true;
                        renderPlayers({ renderNames: true, cardName: "" });
                        if (players[slammed_player_index].display_name === username) {
                            gameWs.send(JSON.stringify({ action: "slam", display_name: players[slammed_player_index].display_name, type: "past_lock" }));
                        }
                        updateCurrentTurn();
                    }, 250); // adjust delay (in ms) as needed
                    return;
                }
                renderPlayers({ renderNames: true, cardName: data.card });
                return;
            }
            // if is in lock, and put special card, then change turn and update hit count
            if (special_card_curriter < special_card_maxiter && card_metadata.type === "special") {
                console.log("was in lock! now just put special card");
                slammed_player_index = currentTurnIndex;
                updateCurrentTurn();
                special_card_maxiter = card_metadata.hitCount;
                special_card_curriter = 0;
                renderPlayers({ renderNames: true, cardName: data.card });
                return;
            }

            // if wasn't special, but now is, update hit count and change turn
            if (card_metadata.type === "special") {
                console.log("wasn't special, now started being special: " + card_metadata.hitCount);
                slammed_player_index = currentTurnIndex;
                updateCurrentTurn();
                special_card_maxiter = card_metadata.hitCount;
                special_card_curriter = 0;
                renderPlayers({ renderNames: true, cardName: data.card });
                return;
            }

            // if wasnt special, and still isn't then just update turn and render
            console.log("wasn't special, still not");
            updateCurrentTurn();
            renderPlayers({ renderNames: true, cardName: data.card });
            if (checkGameEnd()) {
                renderGameEndScreen();
                gameWs.close();
            }
        }
    };
}

function handleSlam() {
    if (!canPlace) { console.log("slam locked by special card lock animation. you cant slam in that period") }
    let isSlamValid = false;
    console.log("slam pressed");

    const currentCard = current_deck_stack[current_deck_stack.length - 1];
    const cur_metadata = getCardMetadata(currentCard);
    console.log(cur_metadata);

    /* 
    default rules - 
    - sandwich with first card or card in between
    - normal sandwich
    - if current card on deck is king, queen, or jack, check card count, then make player insert a card at the bottom
    */
    // is sandwich whole deck or sandwich last last card or equal to previous card?
    // is sandwich whole deck
    // has 3 or more cards, check cases: first ever vs current & first vs third (sandwich)
    if (current_deck_stack.length >= 3) {
        console.log("checking first ever");
        // check first ever - full works
        const firstCard = getCardMetadata(current_deck_stack[0]);
        console.log(firstCard);
        console.log(cur_metadata);
        if (cur_metadata.number === firstCard.number) {
            console.log("is valid");
            isSlamValid = true;
        }

        // check sandwich
        console.log("checking sandwich");
        const thirdLastCard = getCardMetadata(current_deck_stack[current_deck_stack.length - 3]);
        if (cur_metadata.number === thirdLastCard.number) {
            console.log("is valid");
            isSlamValid = true;
        }
    }
    // now check 2 cards in consecutive 
    if (current_deck_stack.length > 1) {
        console.log("checking 2 cards consecutive");
        const secondLastCard = getCardMetadata(current_deck_stack[current_deck_stack.length - 2]);
        console.log(secondLastCard);
        if (cur_metadata.number === secondLastCard.number) {
            console.log("is valid");
            isSlamValid = true;
        }
    }
    console.log("is slam valid? " + isSlamValid);

    // check is special card?
    if (special_card_curriter !== 0) { console.log("slammed while there's a special card!") }

    if (!isSlamValid) return;
    // slam went through, gonna tell everyone now
    gameWs.send(JSON.stringify({ action: "slam", display_name: username, type: "normal" }));
}

function handlePlaceCard() {
    if (!canPlace) { return; }
    // get index of my username
    let myIndex;
    for (myIndex = 0; myIndex < players.length; myIndex++) {
        if (players[myIndex].display_name === username) {
            break;
        }
    }
    if (currentTurnIndex !== myIndex) {
        console.log("is not my turn, will not place card");
        return;
    }
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


function renderPlayers({ renderNames = true, cardName = "" } = {}) {
    renderCardPlaced(cardName, () => renderUI({ renderNames: renderNames }));
}

function renderUI({ renderNames = true }) {
    players.forEach((player, index) => {
        const yPosition = (canvas.height * 0.5) + (index * 40);
        const circleX = canvas.width * 0.1;
        const radius = 15;
        const textX = circleX + radius + 10;

        // Clear the whole player area (circle + name + dot)
        ctx.clearRect(circleX - radius - 10, yPosition - radius - 5, canvas.width, radius * 2 + 10);

        // Re-draw circle with current number, if index is current index, change green color 
        renderPlayerCircle(ctx, circleX, yPosition, card_amounts[index], index === currentTurnIndex);


        // Render name and turn indicator if requested
        if (renderNames) {
            renderPlayerName(ctx, textX, yPosition, player.display_name);
        }
    });
}

function renderPlayerCircle(ctx, x, y, number, isPlayerTurn) {
    const radius = 15;

    // Draw circle
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (!isPlayerTurn) {
        ctx.fillStyle = "#007BFF"; // Blue fill
    } else {
        ctx.fillStyle = "limegreen"; // Bright green
    }
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

function renderCardPlaced(card_name, after_finished) {
    if (!card_name || card_name === "") {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        after_finished();
        return;
    }
    const image = new Image();
    image.src = `/egyptian-war/images/cards/${card_name}.png`;
    let scale = 0.01;
    targetScale = 0.25;
    let direction = 0.025; // speed to change scale for
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        after_finished();
        ctx.drawImage(image, canvas.width / 2 - (image.width * scale / 2), canvas.height / 2 - (image.height * scale / 2), image.width * scale, image.height * scale);
        scale += direction;
        if (scale >= targetScale) {
            after_finished();
            ctx.drawImage(image, canvas.width / 2 - (image.width * scale / 2), canvas.height / 2 - (image.height * scale / 2), image.width * scale, image.height * scale);
            return;
        }
        requestAnimationFrame(draw);
    }
    image.onload = function () {
        draw();
    }
    image.onerror = function () {
        console.error("image error");
    }
}
function renderGameEndScreen(winner) {
    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a252f');
    gradient.addColorStop(0.5, '#2c3e50');
    gradient.addColorStop(1, '#34495e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add confetti-like particles
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 8 + 4;
        ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // Main "GAME OVER" text
    ctx.font = "bold 48px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);

    // Winner announcement
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#f1c40f";
    ctx.fillText(`🎉 ${winner.display_name} WINS! 🎉`, canvas.width / 2, canvas.height / 2 - 20);

    // Final scores
    ctx.font = "20px Arial";
    ctx.fillStyle = "#ecf0f1";
    ctx.fillText("Final Scores:", canvas.width / 2, canvas.height / 2 + 40);

    players.forEach((player, index) => {
        const yPos = canvas.height / 2 + 80 + (index * 30);
        ctx.fillStyle = index === players.indexOf(winner) ? "#f1c40f" : "#bdc3c7";
        ctx.fillText(`${player.display_name}: ${card_amounts[index]} cards`, canvas.width / 2, yPos);
    });
}

function checkGameEnd() {
    const playersWithCards = card_amounts.filter(amount => amount > 0);
    if (playersWithCards.length === 1) {
        const winnerIndex = card_amounts.findIndex(amount => amount > 0);
        const winner = players[winnerIndex];
        renderGameEndScreen(winner);
        return true;
    }
    return false;
}