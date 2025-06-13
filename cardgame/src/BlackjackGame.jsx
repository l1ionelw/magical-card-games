import React, { useEffect, useReducer } from "react";
import { createDeck, createHand } from "./cardGamesModels.js";
import PlayingCardView from "./PlayingCardView.jsx";

// --- Chip denominations/colors (for display) ---
const CHIP_DENOMS = [
    { value: 100, color: "#222" }, // black
    { value: 50, color: "#009aff" }, // blue
    { value: 10, color: "#e94b4b" }, // red
];

// --- Utility to break amount into chips ---
function makeChipStack(amount) {
    let chips = [];
    let left = amount;
    for (const { value, color } of CHIP_DENOMS) {
        while (left >= value) {
            chips.push({ value, color });
            left -= value;
        }
    }
    return chips;
}

// --- Initial State ---
const initialState = {
    deck: createDeck(),
    playerHand: createHand(),
    dealerHand: createHand(),
    playerChips: 500,
    playerBet: 50,
    betPlaced: false,
    isPlayerTurn: false,
    isGameOver: false,
    dealerReveals: false,
    blackjackResult: "",
    allowedToDouble: false,
    error: "",
    chipDelta: 0,
    showChipDelta: false,
    confetti: false,
};

// --- Reducer for complex state logic ---
function reducer(state, action) {
    switch (action.type) {
        case "RESET":
            return {
                ...initialState,
                playerChips: state.playerChips > 0 ? state.playerChips : 500,
            };
        case "SET_BET":
            if (state.betPlaced || action.amount > state.playerChips || action.amount <= 0) {
                return { ...state, error: "Invalid bet." };
            }
            return {
                ...state,
                playerBet: action.amount,
                playerChips: state.playerChips - action.amount,
                betPlaced: true,
                error: "",
            };
        case "DEAL":
            // Deal two to player, two to dealer (one face down)
            const deck = createDeck();
            const playerHand = createHand([
                { ...deck.draw(), isFaceUp: true },
                { ...deck.draw(), isFaceUp: true },
            ]);
            const dealerHand = createHand([
                { ...deck.draw(), isFaceUp: false },
                { ...deck.draw(), isFaceUp: true },
            ]);
            let allowedToDouble =
                playerHand.cards.length === 2 &&
                state.playerChips >= state.playerBet &&
                !playerHand.isBlackjack();
            return {
                ...state,
                deck,
                playerHand,
                dealerHand,
                isPlayerTurn: true,
                isGameOver: false,
                dealerReveals: false,
                blackjackResult: "",
                allowedToDouble,
                showChipDelta: false,
                chipDelta: 0,
                confetti: false,
            };
        case "PLAYER_HIT":
            if (!state.isPlayerTurn || state.isGameOver) return state;
            var card = { ...state.deck.draw(), isFaceUp: true };
            state.playerHand.add(card);
            let bust = state.playerHand.isBusted();
            return {
                ...state,
                playerHand: createHand([...state.playerHand.cards]),
                allowedToDouble: false,
                isPlayerTurn: !bust,
                isGameOver: bust,
                blackjackResult: bust ? "You busted! Dealer wins." : "",
            };
        case "PLAYER_STAND":
            return {
                ...state,
                isPlayerTurn: false,
                dealerReveals: true,
            };
        case "PLAYER_DOUBLE":
            if (
                !state.allowedToDouble ||
                !state.isPlayerTurn ||
                state.playerChips < state.playerBet
            )
                return state;
            var doubleCard = { ...state.deck.draw(), isFaceUp: true };
            state.playerHand.add(doubleCard);
            return {
                ...state,
                playerHand: createHand([...state.playerHand.cards]),
                playerChips: state.playerChips - state.playerBet,
                playerBet: state.playerBet * 2,
                allowedToDouble: false,
                isPlayerTurn: false,
                dealerReveals: true,
            };
        case "DEALER_PLAY":
            // Reveal dealer's first card
            state.dealerHand.cards[0].isFaceUp = true;
            let dHand = createHand([...state.dealerHand.cards]);
            // Dealer draws to 17+
            while (
                dHand.value() < 17 ||
                (dHand.value() === 17 && dHand.isSoft && dHand.isSoft())
                ) {
                let drawn = { ...state.deck.draw(), isFaceUp: true };
                if (!drawn || !drawn.rank) break;
                dHand.add(drawn);
            }
            return {
                ...state,
                dealerHand: createHand([...dHand.cards]),
            };
        case "END_GAME":
            // Settle, show messages, chips, confetti
            let pHand = state.playerHand;
            let dHandEnd = state.dealerHand;
            let resultMsg = "";
            let payout = 0;
            let delta = 0;
            let win = false;
            if (pHand.isBusted()) {
                resultMsg = "You busted! Dealer wins.";
                delta = -state.playerBet;
            } else if (dHandEnd.isBusted()) {
                resultMsg = "Dealer busts! You win!";
                payout = state.playerBet * 2;
                delta = payout - state.playerBet;
                win = true;
            } else if (pHand.isBlackjack()) {
                if (dHandEnd.isBlackjack()) {
                    resultMsg = "Both have Blackjack! Push.";
                    payout = state.playerBet;
                    delta = 0;
                } else {
                    resultMsg = "Blackjack! You win 3:2.";
                    payout = Math.floor(state.playerBet * 2.5);
                    delta = payout - state.playerBet;
                    win = true;
                }
            } else if (dHandEnd.isBlackjack()) {
                resultMsg = "Dealer has Blackjack! Dealer wins.";
                delta = -state.playerBet;
            } else if (pHand.value() > dHandEnd.value()) {
                resultMsg = "You win!";
                payout = state.playerBet * 2;
                delta = payout - state.playerBet;
                win = true;
            } else if (pHand.value() < dHandEnd.value()) {
                resultMsg = "Dealer wins.";
                delta = -state.playerBet;
            } else {
                resultMsg = "Push! Your bet is returned.";
                payout = state.playerBet;
                delta = 0;
            }
            return {
                ...state,
                isGameOver: true,
                blackjackResult: resultMsg,
                playerChips: state.playerChips + payout,
                chipDelta: delta,
                showChipDelta: delta !== 0,
                betPlaced: false,
                confetti: win,
            };
        case "CLEAR_ERROR":
            return { ...state, error: "" };
        default:
            return state;
    }
}

// --- Display Helpers ---
function cardDisplay(card) {
    return card.isFaceUp ? `${card.rank.display}${card.suit.symbol}` : "🂠";
}

// --- Main Component ---
export default function BlackjackGame({ onBack }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    // After bet placed, deal
    useEffect(() => {
        if (state.betPlaced) {
            dispatch({ type: "DEAL" });
        }
        // eslint-disable-next-line
    }, [state.betPlaced]);

    // After dealerReveals, play dealer and then end game
    useEffect(() => {
        if (state.dealerReveals && !state.isGameOver) {
            setTimeout(() => {
                dispatch({ type: "DEALER_PLAY" });
                setTimeout(() => {
                    dispatch({ type: "END_GAME" });
                }, 1100); // dealer play animation
            }, 700);
        }
        // eslint-disable-next-line
    }, [state.dealerReveals]);

    function handleBet(amount) {
        dispatch({ type: "SET_BET", amount });
    }

    return (
        <div className="bj-root" style={{ color: "#fff", minHeight: 500, maxWidth: 480, margin: "0 auto", padding: 18 }}>
            <h2 style={{ fontWeight: "bold", fontSize: 36, marginBottom: 8 }}>
                Blackjack
            </h2>
            <button className="cg-btn" style={{ marginBottom: 10 }} onClick={onBack}>
                Back to Home
            </button>
            <div style={{ margin: "12px 0", fontWeight: "bold", fontSize: 18 }}>Chips: ${state.playerChips}</div>
            {state.playerChips <= 0 ? (
                <div style={{ color: "#ff5757", fontWeight: "bold", fontSize: 28 }}>
                    Out of chips! <br />
                    <button className="cg-btn" onClick={() => dispatch({ type: "RESET" })}>Restart</button>
                </div>
            ) : null}
            {state.error && (
                <div style={{ background: "#900", color: "#fff", padding: 8, borderRadius: 7, margin: "10px 0" }}>
                    {state.error}{" "}
                    <button className="cg-btn" style={{ fontSize: 13 }} onClick={() => dispatch({ type: "CLEAR_ERROR" })}>Dismiss</button>
                </div>
            )}
            {!state.betPlaced && state.playerChips > 0 && (
                <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 22, marginBottom: 10 }}>Place Your Bet</div>
                    {[10, 50, 100].map((amt) => (
                        <button
                            key={amt}
                            className="cg-btn"
                            style={{
                                marginRight: 14,
                                background: state.playerChips < amt ? "#777" : CHIP_DENOMS.find((c) => c.value === amt)?.color,
                                color: "#fff",
                                opacity: state.playerChips < amt ? 0.5 : 1,
                            }}
                            disabled={state.playerChips < amt}
                            onClick={() => handleBet(amt)}
                        >
                            ${amt}
                        </button>
                    ))}
                </div>
            )}

            {/* Hands */}
            <div className="bj-hands" style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 10 }}>
                {/* Dealer */}
                <div>
                    <div style={{ fontWeight: "bold" }}>Dealer {state.dealerReveals || state.isGameOver ? `(Value: ${state.dealerHand.value()})` : "(Value: ?)"}</div>
                    <div style={{ display: "flex", gap: 10, margin: "auto" }}>
                        {state.dealerHand.cards.map((c, i) => (
                            <PlayingCardView key={c.id || i} card={c} size={72} />
                        ))}
                    </div>
                </div>
                {/* Player */}
                <div>
                    <div style={{ fontWeight: "bold" }}>You (Value: {state.playerHand.value()})</div>
                    <div style={{ display: "flex", gap: 10, margin: "auto" }}>
                        {state.dealerHand.cards.map((c, i) => (
                            <PlayingCardView key={c.id || i} card={c} size={72} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            {state.betPlaced && !state.isGameOver && (
                <div style={{ marginTop: 20 }}>
                    <button
                        className="cg-btn"
                        onClick={() => dispatch({ type: "PLAYER_HIT" })}
                        disabled={!state.isPlayerTurn}
                        style={{
                            marginRight: 12,
                            background: state.isPlayerTurn ? "#1ecf53" : "#555",
                        }}
                    >
                        Hit
                    </button>
                    <button
                        className="cg-btn"
                        onClick={() => dispatch({ type: "PLAYER_STAND" })}
                        disabled={!state.isPlayerTurn}
                        style={{
                            marginRight: 12,
                            background: state.isPlayerTurn ? "#f7b731" : "#555",
                        }}
                    >
                        Stand
                    </button>
                    <button
                        className="cg-btn"
                        onClick={() => dispatch({ type: "PLAYER_DOUBLE" })}
                        disabled={!state.allowedToDouble}
                        style={{
                            background: state.allowedToDouble ? "#009aff" : "#555",
                        }}
                    >
                        Double
                    </button>
                </div>
            )}
            {/* Results */}
            {state.isGameOver && (
                <div style={{ marginTop: 22, fontSize: 21, fontWeight: "bold", color: "#ffe066" }}>
                    {state.blackjackResult}
                    <div style={{ marginTop: 10 }}>
                        <button className="cg-btn" onClick={() => dispatch({ type: "RESET" })}>
                            Play Again
                        </button>
                    </div>
                </div>
            )}
            {/* Chip delta display */}
            {state.showChipDelta && (
                <div
                    style={{
                        fontSize: 40,
                        fontWeight: "bold",
                        color: state.chipDelta > 0 ? "#2a8a38" : "#e94b4b",
                        marginTop: 18,
                        transition: "transform 0.4s",
                    }}
                >
                    {state.chipDelta > 0 ? `+${state.chipDelta}` : state.chipDelta}
                </div>
            )}
            {/* Confetti (simple emoji) */}
            {state.confetti && (
                <div style={{ fontSize: 42, marginTop: 20 }}>🎉</div>
            )}
        </div>
    );
}