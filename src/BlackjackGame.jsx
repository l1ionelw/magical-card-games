import React, { useState } from "react";
import { createDeck, createHand } from "./cardGamesModels";

function getCardDisplay(card) {
    return card.isFaceUp
        ? `${card.rank.display}${card.suit.symbol}`
        : "🂠";
}

function calculateWinner(playerHand, dealerHand) {
    if (playerHand.isBusted()) return "Dealer wins!";
    if (dealerHand.isBusted()) return "Player wins!";
    if (playerHand.value() > dealerHand.value()) return "Player wins!";
    if (playerHand.value() < dealerHand.value()) return "Dealer wins!";
    return "Push (Draw)";
}

export default function BlackjackGame({ onBack }) {
    const [deck, setDeck] = useState(createDeck());
    const [playerHand, setPlayerHand] = useState(createHand());
    const [dealerHand, setDealerHand] = useState(createHand());
    const [isGameOver, setIsGameOver] = useState(false);
    const [message, setMessage] = useState("");
    const [showDealerHand, setShowDealerHand] = useState(false);

    // Initialize new game
    function startGame() {
        const newDeck = createDeck();
        const player = createHand([
            { ...newDeck.draw(), isFaceUp: true },
            { ...newDeck.draw(), isFaceUp: true },
        ]);
        const dealer = createHand([
            { ...newDeck.draw(), isFaceUp: true },
            { ...newDeck.draw(), isFaceUp: false },
        ]);
        setDeck(newDeck);
        setPlayerHand(player);
        setDealerHand(dealer);
        setIsGameOver(false);
        setMessage("");
        setShowDealerHand(false);
    }

    // Deal initial cards on mount
    React.useEffect(() => {
        startGame();
        // Only run once
        // eslint-disable-next-line
    }, []);

    function handleHit() {
        if (isGameOver) return;
        const card = { ...deck.draw(), isFaceUp: true };
        playerHand.add(card);
        setPlayerHand(createHand([...playerHand.cards]));
        if (playerHand.isBusted()) {
            setIsGameOver(true);
            setShowDealerHand(true);
            setMessage("You busted! Dealer wins.");
        }
    }

    function handleStand() {
        if (isGameOver) return;
        // Reveal dealer's hidden card
        dealerHand.cards[1].isFaceUp = true;
        setShowDealerHand(true);

        // Dealer draws to 17+
        let dealerBusted = false;
        while (dealerHand.value() < 17) {
            const card = { ...deck.draw(), isFaceUp: true };
            dealerHand.add(card);
            if (dealerHand.isBusted()) {
                dealerBusted = true;
                break;
            }
        }
        setDealerHand(createHand([...dealerHand.cards]));
        setIsGameOver(true);

        if (dealerBusted) {
            setMessage("Dealer busted! You win!");
        } else {
            setMessage(calculateWinner(playerHand, dealerHand));
        }
    }

    function handleRestart() {
        startGame();
    }

    return (
        <div style={{ padding: 30, maxWidth: 500, margin: "0 auto", color: "#fff" }}>
            <h2 style={{ fontWeight: "bold", fontSize: 35, marginBottom: 10 }}>
                Blackjack
            </h2>
            <div style={{ marginBottom: 18 }}>
                <b>Your Hand</b> ({playerHand.value()})
                <div style={{ fontSize: 30, margin: "8px 0" }}>
                    {playerHand.cards.map((c) => (
                        <span key={c.id} style={{ marginRight: 8 }}>
              {getCardDisplay(c)}
            </span>
                    ))}
                </div>
                {playerHand.isBusted() && (
                    <span style={{ color: "#ff5a5a" }}>Busted!</span>
                )}
            </div>
            <div style={{ marginBottom: 18 }}>
                <b>Dealer's Hand</b> (
                {showDealerHand
                    ? dealerHand.value()
                    : dealerHand.cards[0].rank.value}
                )
                <div style={{ fontSize: 30, margin: "8px 0" }}>
                    {dealerHand.cards.map((c, idx) =>
                            showDealerHand || idx === 0 ? (
                                <span key={c.id} style={{ marginRight: 8 }}>
                {getCardDisplay(c)}
              </span>
                            ) : (
                                <span key={c.id} style={{ marginRight: 8 }}>
                🂠
              </span>
                            )
                    )}
                </div>
                {showDealerHand && dealerHand.isBusted() && (
                    <span style={{ color: "#ff5a5a" }}>Dealer busted!</span>
                )}
            </div>
            <div style={{ marginBottom: 18, minHeight: 28 }}>
                <b>{message}</b>
            </div>
            <div>
                {!isGameOver ? (
                    <>
                        <button onClick={handleHit} className="cg-btn" style={{ marginRight: 14 }}>
                            Hit
                        </button>
                        <button onClick={handleStand} className="cg-btn">
                            Stand
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={handleRestart} className="cg-btn" style={{ marginRight: 14 }}>
                            Play Again
                        </button>
                    </>
                )}
                <button onClick={onBack} className="cg-btn" style={{ marginLeft: 14 }}>
                    Back to Home
                </button>
            </div>
        </div>
    );
}