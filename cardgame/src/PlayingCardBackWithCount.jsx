import React from "react";

export default function PlayingCardBackWithCount({ count, onClick }) {
    return (
        <div style={{ position: "relative", display: "inline-block", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
            <div style={{
                width: 60,
                height: 90,
                borderRadius: 8,
                backgroundColor: "#2d2d2d",
                border: "2px solid #000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
            }}>
                🂠
            </div>
            <div style={{
                position: "absolute",
                bottom: -10,
                right: -10,
                backgroundColor: "black",
                color: "white",
                borderRadius: "50%",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
            }}>
                {count}
            </div>
        </div>
    );
}