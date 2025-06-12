import React, { useEffect, useReducer, useRef, useState } from "react";
import { createDeck, createHand } from "./cardGamesModels";
import PlayingCardView from "./PlayingCardView.jsx";
import { motion, AnimatePresence } from "framer-motion";

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
    dealAnimQueue: [], // cards to deal for animation, each {to: "player"|"dealer", faceUp: bool}
    dealing: false,
    shuffled: false,
    shuffleAnim: false,
};

function getInitialDealQueue() {
    return [
        { to: "player", faceUp: true },
        { to: "dealer", faceUp: false },
        { to: "player", faceUp: true },
        { to: "dealer", faceUp: true }
    ];
}

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
                shuffled: false,
                shuffleAnim: true,
            };
        case "SHUFFLE_DONE":
            return {
                ...state,
                shuffled: true,
                shuffleAnim: false,
                dealAnimQueue: getInitialDealQueue(),
                dealing: true,
                deck: createDeck(),
                playerHand: createHand([]),
                dealerHand: createHand([]),
                isPlayerTurn: false,
                isGameOver: false,
                dealerReveals: false,
                blackjackResult: "",
                allowedToDouble: false,
                showChipDelta: false,
                chipDelta: 0,
                confetti: false,
            };
        case "DEAL_ANIM_CARD": {
            if (!state.dealAnimQueue.length || !state.deck) return state;
            const [next, ...rest] = state.dealAnimQueue;
            const card = state.deck.draw(next.faceUp);
            let playerHand = state.playerHand;
            let dealerHand = state.dealerHand;

            if (next.to === "player") playerHand = createHand([...playerHand.cards, card]);
            if (next.to === "dealer") dealerHand = createHand([...dealerHand.cards, card]);

            let dealing = rest.length > 0;
            let allowedToDouble = false, isPlayerTurn = false;
            if (!dealing) {
                allowedToDouble =
                    playerHand.cards.length === 2 &&
                    state.playerChips >= state.playerBet &&
                    !playerHand.isBlackjack();
                isPlayerTurn = true;
            }

            return {
                ...state,
                deck: state.deck,
                playerHand,
                dealerHand,
                dealAnimQueue: rest,
                dealing,
                allowedToDouble,
                isPlayerTurn,
            };
        }
        case "PLAYER_HIT":
            if (!state.isPlayerTurn || state.isGameOver) return state;
            return {
                ...state,
                dealAnimQueue: [{ to: "player", faceUp: true }],
                dealing: true,
                allowedToDouble: false,
            };
        case "PLAYER_HIT_COMPLETE":
            const card = state.deck._lastDealtCard; // see below for _lastDealtCard
            const newPlayerHand = createHand([...state.playerHand.cards, card]);
            let bust = newPlayerHand.isBusted();
            return {
                ...state,
                playerHand: newPlayerHand,
                isPlayerTurn: !bust,
                isGameOver: bust,
                blackjackResult: bust ? "You busted! Dealer wins." : "",
                dealing: false,
                allowedToDouble: false,
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
            return {
                ...state,
                playerChips: state.playerChips - state.playerBet,
                playerBet: state.playerBet * 2,
                allowedToDouble: false,
                dealAnimQueue: [{ to: "player", faceUp: true }],
                dealing: true,
                _double: true,
            };
        case "PLAYER_DOUBLE_COMPLETE": {
            const card = state.deck._lastDealtCard;
            const newPlayerHand = createHand([...state.playerHand.cards, card]);
            const busted = newPlayerHand.isBusted();
            return {
                ...state,
                playerHand: newPlayerHand,
                isPlayerTurn: false,
                dealerReveals: !busted,
                isGameOver: busted,
                blackjackResult: busted ? "You busted! Dealer wins." : "",
                dealing: false,
                _double: false,
            };
        }
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

// Patch for deck to track last card drawn for animation finish
function patchDeck(deck) {
    const origDraw = deck.draw;
    deck._lastDealtCard = null;
    deck.draw = function (faceUp = true) {
        const card = origDraw.call(deck, faceUp);
        if (card) deck._lastDealtCard = card;
        return card;
    };
    return deck;
}

export default function BlackjackGame({ onBack }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const [readyToDeal, setReadyToDeal] = useState(false);
    const [animCard, setAnimCard] = useState(null);
    const [animDest, setAnimDest] = useState(null);

    useEffect(() => {
        if (state.betPlaced && !state.shuffled) {
            setTimeout(() => {
                dispatch({ type: "SHUFFLE_DONE" });
            }, 1200);
        }
    }, [state.betPlaced, state.shuffled]);

    useEffect(() => {
        if (state.dealAnimQueue.length && state.dealing && state.deck) {
            setTimeout(() => {
                // Animate card moving from deck to hand
                const next = state.dealAnimQueue[0];
                setAnimCard({ ...state.deck.cards[0], isFaceUp: next.faceUp });
                setAnimDest(next.to);
                setTimeout(() => {
                    dispatch({ type: "DEAL_ANIM_CARD" });
                    setAnimCard(null);
                    setAnimDest(null);
                }, 400);
            }, 350);
        } else if (
            state.dealing &&
            !state.dealAnimQueue.length &&
            state.playerHand &&
            state.dealerHand
        ) {
            if (state._double) {
                setTimeout(() => dispatch({ type: "PLAYER_DOUBLE_COMPLETE" }), 300);
            } else if (!state.isPlayerTurn && !state.isGameOver) {
                setTimeout(() => dispatch({ type: "PLAYER_HIT_COMPLETE" }), 300);
            }
        }
    }, [
        state.dealAnimQueue,
        state.dealing,
        state.deck,
        state.playerHand,
        state.dealerHand,
        state._double,
        state.isPlayerTurn,
        state.isGameOver,
    ]);

    useEffect(() => {
        if (state.dealerReveals && !state.isGameOver) {
            setTimeout(() => {
                dispatch({ type: "DEALER_PLAY" });
                setTimeout(() => {
                    dispatch({ type: "END_GAME" });
                }, 1100);
            }, 700);
        }
    }, [state.dealerReveals, state.isGameOver]);

    function handleBet(amount) {
        dispatch({ type: "SET_BET", amount });
    }

    // Patch the deck on initial shuffle for tracking last card for animation
    useEffect(() => {
        if (state.deck && !state.deck._lastDealtPatched) {
            patchDeck(state.deck);
            state.deck._lastDealtPatched = true;
        }
    }, [state.deck]);

    // Deck stack visual
    function renderDeckStack() {
        if (!state.deck) return null;
        const count = state.deck.cards.length;
        if (count === 0) return null;
        return (
            <div style={{ position: "absolute", left: 30, top: 120, zIndex: 40 }}>
                {[...Array(Math.min(count, 8))].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: i * 2,
                            top: i * 1.5,
                            zIndex: i,
                            opacity: 1 - i * 0.09,
                        }}
                    >
                        <PlayingCardView card={{ isFaceUp: false }} size={72} />
                    </div>
                ))}
            </div>
        );
    }

    // Shuffling animation
    function renderShuffleAnim() {
        return (
            <div
                style={{
                    position: "absolute",
                    left: 30,
                    top: 120,
                    zIndex: 99,
                    width: 72,
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: [0, 18, -18, 12, -12, 0] }}
                    transition={{ repeat: 4, duration: 1.2 }}
                    style={{
                        width: 72,
                        height: 100,
                        borderRadius: 9,
                        boxShadow: "0 4px 18px #0007",
                        background: "linear-gradient(135deg, #2a2948 70%, #456 100%)",
                        border: "2.2px solid #222",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <span style={{ fontSize: 48, color: "#fff", opacity: 0.97 }}>🂠</span>
                </motion.div>
            </div>
        );
    }

    // Flying card animation
    function renderDealingAnim() {
        if (!animCard || !animDest) return null;
        let dest = { left: 0, top: 0 };
        if (animDest === "player") dest = { left: 150, top: 320 };
        if (animDest === "dealer") dest = { left: 150, top: 60 };
        return (
            <motion.div
                initial={{ left: 30, top: 120, position: "absolute", zIndex: 100 }}
                animate={{ left: dest.left, top: dest.top }}
                transition={{ duration: 0.38, ease: "easeInOut" }}
                style={{ position: "absolute", zIndex: 100, pointerEvents: "none" }}
            >
                <PlayingCardView card={animCard} size={72} />
            </motion.div>
        );
    }

    return (
        <div className="bj-root" style={{ color: "#fff", minHeight: 500, maxWidth: 480, margin: "0 auto", padding: 18, position: "relative" }}>
            <h2 style={{ fontWeight: "bold", fontSize: 36, marginBottom: 8 }}>
                Blackjack
            </h2>
            <button className="cg-btn" style={{ marginBottom: 10 }} onClick={onBack}>
                Back to Home
            </button>
            <div style={{ margin: "12px 0", fontWeight: "bold", fontSize: 18 }}>
                Chips: ${state.playerChips}
            </div>
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
            {state.shuffleAnim && renderShuffleAnim()}
            {renderDeckStack()}
            {renderDealingAnim()}
            <div className="bj-hands" style={{ display: "flex", flexDirection: "column", gap: 30, marginTop: 10 }}>
                <div>
                    <div style={{ fontWeight: "bold" }}>
                        Dealer {state.dealerReveals || state.isGameOver ? `(Value: ${state.dealerHand?.value()})` : "(Value: ?)"}
                    </div>
                    <div style={{ display: "flex", gap: 10, minHeight: 110, margin: "auto" }}>
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
                    <div style={{ fontWeight: "bold" }}>
                        You (Value: {state.playerHand?.value()})
                    </div>
                    <div style={{ display: "flex", gap: 10, minHeight: 110, margin: "auto" }}>
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
            {state.betPlaced && !state.isGameOver && !state.dealing && (
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