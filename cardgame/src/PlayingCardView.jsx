import React from "react";

// Helper: get color string for suit
function colorForSuit(suit) {
    if (!suit) return "#222";
    return suit.color === "red" ? "#e94b4b" : "#222";
}

export default function PlayingCardView({ card, style = {}, size = 90 }) {
    // Defensive: if no card, render nothing
    if (!card) return null;

    // size: width of card in px, height auto (2.5:3.5 ratio)
    const cardHeight = Math.round(size * 1.4);

    // Face down card
    if (!card.isFaceUp) {
        return (
            <div
                style={{
                    width: size,
                    height: cardHeight,
                    borderRadius: size * 0.13,
                    background: "linear-gradient(135deg, #2a2948 70%, #456 100%)",
                    border: `2.2px solid #222`,
                    boxShadow: "0 4px 12px #0005",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    ...style,
                }}
            >
                <span
                    style={{
                        fontSize: size * 0.7,
                        color: "#fff",
                        opacity: 0.93,
                        userSelect: "none",
                        textShadow: "0 1.5px 1.5px #0007",
                    }}
                    aria-label="Card back"
                >
                    🂠
                </span>
            </div>
        );
    }

    // Face up card
    const color = colorForSuit(card.suit);

    // Defensive: check suit and rank
    const displayRank = card.rank?.display ?? "?";
    const displaySuit = card.suit?.symbol ?? "?";
    const suitKey =
        card.suit?.key
            ? card.suit.key.charAt(0).toUpperCase() + card.suit.key.slice(1)
            : "?";

    return (
        <div
            style={{
                width: size,
                height: cardHeight,
                background: "#fff",
                borderRadius: size * 0.13,
                border: `2.2px solid #222`,
                boxShadow: "0 4px 12px #0005",
                position: "relative",
                overflow: "hidden",
                ...style,
            }}
            aria-label={`${displayRank} of ${suitKey}`}
        >
            {/* Corner: top-left */}
            <div
                style={{
                    position: "absolute",
                    top: 7,
                    left: 8,
                    textAlign: "left",
                    color,
                    fontFamily: "serif",
                    fontWeight: "bold",
                    userSelect: "none",
                    lineHeight: "1",
                }}
            >
                <div style={{ fontSize: size * 0.32 }}>{displayRank}</div>
                <div style={{ fontSize: size * 0.23, marginTop: -2 }}>{displaySuit}</div>
            </div>
            {/* Corner: bottom-right (flipped) */}
            <div
                style={{
                    position: "absolute",
                    bottom: 7,
                    right: 8,
                    textAlign: "right",
                    color,
                    fontFamily: "serif",
                    fontWeight: "bold",
                    userSelect: "none",
                    transform: "rotate(180deg)",
                    lineHeight: "1",
                }}
            >
                <div style={{ fontSize: size * 0.32 }}>{displayRank}</div>
                <div style={{ fontSize: size * 0.23, marginTop: -2 }}>{displaySuit}</div>
            </div>
            {/* Center suit large */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    color,
                    opacity: 0.23,
                    fontSize: size * 1.1,
                    userSelect: "none",
                    pointerEvents: "none",
                }}
            >
                {displaySuit}
            </div>
        </div>
    );
}