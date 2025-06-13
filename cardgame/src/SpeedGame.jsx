import React, { useEffect, useMemo, useState } from "react";
import PlayingCardView from "./PlayingCardView.jsx";
import PlayingCardBackWithCount from "./PlayingCardBackWithCount.jsx";

const fullDeck = () =>
    Array.from({ length: 13 }, (_, i) => i + 1).flatMap((n) => [n, n, n, n]);

const shuffle = (arr) =>
    arr
        .map((v) => [v, Math.random()])
        .sort((a, b) => a[1] - b[1])
        .map(([v]) => v);

const canPlay = (card, center) =>
    card === center - 1 ||
    card === center + 1 ||
    (card === 1 && center === 13) ||
    (card === 13 && center === 1);

const rankText = (n) =>
    n === 1 ? "A" : n === 11 ? "J" : n === 12 ? "Q" : n === 13 ? "K" : String(n);

export default function SpeedGame() {
    const {
        playerDeckInit,
        cpuDeckInit,
        centerLeftInit,
        centerRightInit,
        tieLeftInit,
        tieRightInit,
    } = useMemo(() => {
        const deck = shuffle(fullDeck());
        return {
            playerDeckInit: deck.slice(0, 20),
            cpuDeckInit: deck.slice(20, 40),
            centerLeftInit: deck[40],
            centerRightInit: deck[41],
            tieLeftInit: deck.slice(42, 46),
            tieRightInit: deck.slice(46, 50),
        };
    }, []);

    const [playerDeck, setPlayerDeck] = useState(playerDeckInit);
    const [cpuDeck, setCpuDeck] = useState(cpuDeckInit);
    const [playerHand, setPlayerHand] = useState([]);
    const [cpuHand, setCpuHand] = useState([]);
    const [centerPiles, setCenterPiles] = useState([centerLeftInit, centerRightInit]);
    const [tieLeft, setTieLeft] = useState(tieLeftInit);
    const [tieRight, setTieRight] = useState(tieRightInit);
    const [winner, setWinner] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

    const refillHand = (deck, hand) => {
        const newHand = [...hand];
        while (newHand.length < 5 && deck.length > 0) {
            newHand.push(deck.shift());
        }
        return [deck, newHand];
    };

    useEffect(() => {
        const [newCpuDeck, newCpuHand] = refillHand([...cpuDeck], [...cpuHand]);
        const [newPlayerDeck, newPlayerHand] = refillHand([...playerDeck], [...playerHand]);
        setCpuDeck(newCpuDeck);
        setCpuHand(newCpuHand);
        setPlayerDeck(newPlayerDeck);
        setPlayerHand(newPlayerHand);
    }, []);

    useEffect(() => {
        if (!winner) {
            const interval = setInterval(() => {
                const valid = cpuHand.find((c) => centerPiles.some((p) => canPlay(c, p)));
                if (valid) {
                    const newCenter = [...centerPiles];
                    const pileIdx = canPlay(valid, newCenter[0]) ? 0 : 1;
                    newCenter[pileIdx] = valid;
                    setCenterPiles(newCenter);
                    const newHand = cpuHand.filter((c) => c !== valid);
                    const [newDeck, newFilledHand] = refillHand([...cpuDeck], newHand);
                    setCpuDeck(newDeck);
                    setCpuHand(newFilledHand);
                } else if (
                    cpuDeck.length === 0 &&
                    cpuHand.length === 0 &&
                    playerDeck.length === 0 &&
                    playerHand.length === 0
                ) {
                    setWinner("draw");
                    setShowPopup(true);
                } else if (cpuDeck.length === 0 && cpuHand.length === 0) {
                    setWinner("player");
                    setShowPopup(true);
                }
            }, 500);
            return () => clearInterval(interval);
        }
    }, [cpuHand, centerPiles, winner, cpuDeck, playerDeck, playerHand]);

    const playCard = (card) => {
        const pileIdx = canPlay(card, centerPiles[0]) ? 0 : canPlay(card, centerPiles[1]) ? 1 : -1;
        if (pileIdx === -1) return;
        const newCenter = [...centerPiles];
        newCenter[pileIdx] = card;
        setCenterPiles(newCenter);
        const newHand = playerHand.filter((c) => c !== card);
        const [newDeck, newFilledHand] = refillHand([...playerDeck], newHand);
        setPlayerDeck(newDeck);
        setPlayerHand(newFilledHand);
    };

    const handleTiebreakerClick = (side) => {
        const canAnyonePlay = [...playerHand, ...cpuHand].some((card) =>
            centerPiles.some((pile) => canPlay(card, pile))
        );
        if (canAnyonePlay) return;
        if (side === "left" && tieLeft.length > 0 && tieRight.length > 0) {
            const newCardPlayer = tieLeft[0];
            const newCardCpu = tieRight[0];
            setTieLeft((t) => t.slice(1));
            setTieRight((t) => t.slice(1));
            setCenterPiles(() => [newCardPlayer, newCardCpu]);
        }
    };

    useEffect(() => {
        if (!winner && playerDeck.length === 0 && playerHand.length === 0) {
            if (cpuDeck.length === 0 && cpuHand.length === 0) {
                setWinner("draw");
            } else {
                setWinner("player");
            }
            setShowPopup(true);
        } else if (
            !winner && cpuDeck.length === 0 && cpuHand.length === 0 &&
            tieLeft.length === 0 && tieRight.length === 0
        ) {
            setWinner("cpu");
            setShowPopup(true);
        }
    }, [playerDeck, playerHand, cpuDeck, cpuHand, tieLeft, tieRight, winner]);

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h2>Speed Card Game</h2>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                    <h4>CPU</h4>
                    <div style={{ display: "flex", gap: 4 }}>
                        {cpuHand.map((_, i) => (
                            <PlayingCardView key={i} card={{ isFaceUp: false }} style={{ transition: "all 0.3s" }} />
                        ))}
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <PlayingCardBackWithCount count={cpuDeck.length} />
                </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 30 }}>
                <PlayingCardBackWithCount count={tieLeft.length} onClick={() => handleTiebreakerClick("left")} />

                {centerPiles.map((card, idx) => (
                    <PlayingCardView
                        key={idx}
                        card={{ rank: rankText(card), suit: { symbol: "♠", key: "spades", color: "black" }, isFaceUp: true }}
                        style={{ transition: "all 0.3s ease-in-out", transform: "scale(1.1)" }}
                    />
                ))}

                <PlayingCardBackWithCount count={tieRight.length} onClick={() => handleTiebreakerClick("right")} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 30 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <PlayingCardBackWithCount count={playerDeck.length} />
                </div>
                <div>
                    <h4>You</h4>
                    <div style={{ display: "flex", gap: 4 }}>
                        {playerHand.map((card, i) => {
                            const playable = centerPiles.some((c) => canPlay(card, c));
                            return (
                                <button
                                    key={i}
                                    onClick={() => {
                                        if (playable) playCard(card);
                                    }}
                                    style={{
                                        cursor: playable ? "pointer" : "not-allowed",
                                        opacity: playable ? 1 : 0.4,
                                        border: "none",
                                        background: "transparent",
                                        padding: 0,
                                        transition: "transform 0.2s",
                                    }}
                                >
                                    <PlayingCardView
                                        card={{ rank: rankText(card), suit: { symbol: "♥", key: "hearts", color: "red" }, isFaceUp: true }}
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {showPopup && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000,
                    }}
                >
                    <div style={{ background: "white", padding: 30, borderRadius: 8, textAlign: "center" }}>
                        <h2>
                            {winner === "player"
                                ? "You Win!"
                                : winner === "cpu"
                                    ? "CPU Wins!"
                                    : "It's a Draw!"}
                        </h2>
                        <button onClick={() => window.location.reload()}>Play Again</button>
                    </div>
                </div>
            )}
        </div>
    );
}