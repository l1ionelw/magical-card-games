import React from "react";

function colorForSuit(suit) {
    return suit?.color === "red" ? "#e94b4b" : "#222";
}

export default function PlayingCardView2({ card, style = {}, size = 90 }) {
    const cardHeight = Math.round(size * 1.4);

    if (!card.isFaceUp) {
        return (
            <div
                style={{
                    width: size,
                    height: cardHeight,
                    borderRadius: size * 0.13,
                    background: "linear-gradient(135deg, #2a2948 70%, #456 100%)",
                    border: "2.2px solid #222",
                    boxShadow: "0 4px 12px #0005",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...style,
                }}
            >
                <span style={{ fontSize: size * 0.7, color: "#fff", opacity: 0.93, textShadow: "0 1.5px 1.5px #0007" }}>
                    🂠
                </span>
            </div>
        );
    }

    const color = colorForSuit(card.suit);

    return (
        <div
            style={{
                width: size,
                height: cardHeight,
                background: "#fff",
                borderRadius: size * 0.13,
                border: "2.2px solid #222",
                boxShadow: "0 4px 12px #0005",
                position: "relative",
                overflow: "hidden",
                ...style,
            }}
        >
            {/* Top-left corner */}
            <div style={{ position: "absolute", top: 7, left: 8, textAlign: "left", color, fontFamily: "serif", fontWeight: "bold", userSelect: "none", lineHeight: "1" }}>
                <div style={{ fontSize: size * 0.32 }}>{card.rank}</div>
                <div style={{ fontSize: size * 0.23, marginTop: -2 }}>{card.suit.symbol}</div>
            </div>

            {/* Bottom-right corner */}
            <div style={{ position: "absolute", bottom: 7, right: 8, textAlign: "right", color, fontFamily: "serif", fontWeight: "bold", userSelect: "none", transform: "rotate(180deg)", lineHeight: "1" }}>
                <div style={{ fontSize: size * 0.32 }}>{card.rank}</div>
                <div style={{ fontSize: size * 0.23, marginTop: -2 }}>{card.suit.symbol}</div>
            </div>

            {/* Large faded symbol center */}
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color, opacity: 0.23, fontSize: size * 1.1, userSelect: "none" }}>
                {card.suit.symbol}
            </div>
        </div>
    );
}