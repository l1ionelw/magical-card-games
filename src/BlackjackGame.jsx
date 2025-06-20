import React, { useEffect, useReducer } from "react";
import { createDeck, createHand } from "./cardGamesModels";
import PlayingCardView from "./PlayingCardView.jsx";
import { motion } from "framer-motion";

const CHIP_DENOMS = [
    { value: 100, color: "#222" },
    { value: 50, color: "#009aff" },
    { value: 10, color: "#e94b4b" },
];

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

const initialState = {
    deck: null,
    playerHand: null,
    dealerHand: null,
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
        case "DEAL": {
            const deck = createDeck();
            const playerCards = [deck.draw(true), deck.draw(true)];
            const dealerCards = [deck.draw(false), deck.draw(true)];
            const playerHand = createHand(playerCards);
            const dealerHand = createHand(dealerCards);
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
        }
        case "PLAYER_HIT":
            if (!state.isPlayerTurn || state.isGameOver) return state;
            const card = state.deck.draw(true);
            const newPlayerHand = createHand([...state.playerHand.cards, card]);
            let bust = newPlayerHand.isBusted();
            return {
                ...state,
                playerHand: newPlayerHand,
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
            const doubleCard = state.deck.draw(true);
            const handAfterDouble = createHand([...state.playerHand.cards, doubleCard]);
            const busted = handAfterDouble.isBusted();
            return {
                ...state,
                playerHand: handAfterDouble,
                playerChips: state.playerChips - state.playerBet,
                playerBet: state.playerBet * 2,
                allowedToDouble: false,
                isPlayerTurn: false,
                dealerReveals: !busted,
                isGameOver: busted,
                blackjackResult: busted ? "You busted! Dealer wins." : "",
            };
        case "DEALER_PLAY":
            state.dealerHand.cards[0].isFaceUp = true;
            let dHand = createHand([...state.dealerHand.cards]);
            while (
                dHand.value() < 17 ||
                (dHand.value() === 17 && dHand.isSoft && dHand.isSoft())
                ) {
                let drawn = state.deck.draw(true);
                if (!drawn || !drawn.rank) break;
                dHand.cards.push(drawn);
            }
            return {
                ...state,
                dealerHand: createHand([...dHand.cards]),
            };
        case "END_GAME": {
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
        }
        case "CLEAR_ERROR":
            return { ...state, error: "" };
        default:
            return state;
    }
}

export default function BlackjackGame({ onBack }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    useEffect(() => {
        if (state.betPlaced) {
            dispatch({ type: "DEAL" });
        }
    }, [state.betPlaced]);

    useEffect(() => {
        if (state.dealerReveals && !state.isGameOver) {
            setTimeout(() => {
                dispatch({ type: "DEALER_PLAY" });
                setTimeout(() => {
                    dispatch({ type: "END_GAME" });
                }, 1100);
            }, 700);
        }
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
                                background: state.playerChips < amt ? "#777" : "#333",
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

            <div className="bj-hands" style={{
                display: "flex",
                flexDirection: "column",
                gap: 40, // Increased spacing between dealer and player sections
                marginTop: 10
            }}>
                <div>
                    <div style={{
                        fontWeight: "bold",
                        marginBottom: 16, // Space between value and dealer cards
                        fontSize: 18,
                    }}>
                        Dealer {state.dealerReveals || state.isGameOver ? `(Value: ${state.dealerHand?.value()})` : "(Value: ?)"}
                    </div>
                    <div style={{
                        display: "flex",
                        gap: 14,
                        margin: "auto"
                    }}>
                        {state.dealerHand?.cards.map((c, i) => (
                            <motion.div
                                key={c.id || i}
                                initial={{ y: -30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <PlayingCardView card={c} size={72} />
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div>
                    <div style={{
                        fontWeight: "bold",
                        marginBottom: 16, // Space between value and player cards
                        fontSize: 18,
                    }}>
                        You (Value: {state.playerHand?.value()})
                    </div>
                    <div style={{
                        display: "flex",
                        gap: 14,
                        margin: "auto"
                    }}>
                        {state.playerHand?.cards.map((c, i) => (
                            <motion.div
                                key={c.id || i}
                                initial={{ y: 40, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                            >
                                <PlayingCardView card={c} size={72} />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

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
            {state.confetti && (
                <div style={{ fontSize: 42, marginTop: 20 }}>🎉</div>
            )}
        </div>
    );
}