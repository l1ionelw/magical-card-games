import React, { useState, useContext, createContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./cga.css";
import BlackjackGame from "./BlackjackGame.jsx";

// ---------- Contexts ----------

const ThemeContext = createContext();
const GlobalGameContext = createContext();
const NavigationContext = createContext();
const SettingsContext = createContext();

// ---------- Navigation / Routing ----------

const GameScreen = {
    HOME: "home",
    GAME: (gameType) => ({ type: "game", game: gameType }),
};

function useNavigation() {
    return useContext(NavigationContext);
}
function useTheme() {
    return useContext(ThemeContext);
}
function useGlobalGame() {
    return useContext(GlobalGameContext);
}
function useSettings() {
    return useContext(SettingsContext);
}

// ---------- Global Game Types ----------

const CardGameTypes = [
    {
        key: "blackjack",
        displayName: "Blackjack",
        description: "Beat the dealer to 21.",
        previewImage: "preview_blackjack",
        isPlayable: true,
    },
    {
        key: "speed",
        displayName: "Speed",
        description: "Fastest player wins.",
        previewImage: "preview_speed",
        isPlayable: false,
    },
    // ... add others as needed
];

function getGameTypeByKey(key) {
    return CardGameTypes.find((g) => g.key === key);
}

// ---------- Theme Management ----------

function defaultTheme() {
    return {
        primaryColor: "#2a8a38",
        accentColor: "#1a69b8",
        chipColor: "#ffe066",
        cardBackColor: "#323258",
        darkMode: false,
        toggleTheme: () => {},
    };
}

// ---------- Global State ----------

function defaultGlobalState() {
    return {
        playerName: "Player",
        chips: 1000,
        stats: {},
        recentGames: [],
        recordResult: (gameKey, result) => {},
    };
}

// ---------- Settings ----------

function defaultSettings() {
    return {
        soundOn: true,
        hapticsOn: true,
        accessibilityEnabled: false,
        customDeck: false,
    };
}

// ---------- App Entry ----------

export default function CardGamesApp() {
    const [theme, setTheme] = useState(defaultTheme());
    const [globalGame, setGlobalGame] = useState(defaultGlobalState());
    const [settings, setSettings] = useState(defaultSettings());
    const [screen, setScreen] = useState(GameScreen.HOME);

    // Routing helpers
    const navigation = {
        currentScreen: screen,
        goHome: () => setScreen(GameScreen.HOME),
        selectGame: (gameKey) => setScreen(GameScreen.GAME(gameKey)),
    };

    // Theme toggle
    theme.toggleTheme = () =>
        setTheme((old) => ({ ...old, darkMode: !old.darkMode }));

    // Record result
    globalGame.recordResult = (gameKey, result) => {
        setGlobalGame((old) => {
            const stats = { ...old.stats };
            if (!stats[gameKey]) stats[gameKey] = { wins: 0, losses: 0, draws: 0 };
            if (result === "win") stats[gameKey].wins += 1;
            else if (result === "loss") stats[gameKey].losses += 1;
            else if (result === "draw") stats[gameKey].draws += 1;
            const recentGames = [gameKey, ...old.recentGames].slice(0, 10);
            return { ...old, stats, recentGames };
        });
    };

    // Context providers
    return (
        <ThemeContext.Provider value={theme}>
            <GlobalGameContext.Provider value={globalGame}>
                <NavigationContext.Provider value={navigation}>
                    <SettingsContext.Provider value={settings}>
                        <CardGamesRootView />
                    </SettingsContext.Provider>
                </NavigationContext.Provider>
            </GlobalGameContext.Provider>
        </ThemeContext.Provider>
    );
}

// ---------- Root View ----------

function CardGamesRootView() {
    const theme = useTheme();
    const navigation = useNavigation();

    const bgClass = theme.darkMode ? "cg-bg dark" : "cg-bg";

    return (
        <div className={bgClass}>
            <AnimatePresence mode="wait">
                {navigation.currentScreen === GameScreen.HOME ? (
                    <motion.div
                        key="home"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        transition={{ duration: 0.37, type: "spring", stiffness: 90 }}
                    >
                        <HomeView />
                    </motion.div>
                ) : navigation.currentScreen.type === "game" ? (
                    <motion.div
                        key="game"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -40 }}
                        transition={{ duration: 0.37, type: "spring", stiffness: 90 }}
                    >
                        <GameContainerView gameType={navigation.currentScreen.game} />
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}

// ---------- Home View (Game Selection) ----------

function HomeView() {
    const navigation = useNavigation();
    const theme = useTheme();
    const globalGame = useGlobalGame();

    return (
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "18px 0" }}>
            <div className="cg-header">
                <span className="cg-logo">🃏</span>
                <span className="cg-title">Card Games</span>
            </div>
            <div className="cg-subtitle">Select a game to play</div>
            <div className="cg-grid">
                {CardGameTypes.map((game) => (
                    <GamePreviewCardView
                        key={game.key}
                        game={game}
                        onClick={() => game.isPlayable && navigation.selectGame(game.key)}
                    />
                ))}
            </div>
            <div style={{ marginTop: 30 }}>
                <PlayerStatsBar />
            </div>
        </div>
    );
}

// ---------- Game Preview Card with Framer Motion ----------

function GamePreviewCardView({ game, onClick }) {
    return (
        <motion.div
            className={"cg-card-preview" + (game.isPlayable ? "" : " cg-card-inactive")}
            onClick={onClick}
            tabIndex={game.isPlayable ? 0 : -1}
            aria-label={`${game.displayName} preview`}
            role="button"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={game.isPlayable ? { scale: 1.07, boxShadow: "0 10px 24px #2225" } : {}}
            transition={{ duration: 0.28, type: "spring", stiffness: 120 }}
        >
            <div className="cg-card-preview-img" />
            <div className="cg-card-preview-title">{game.displayName}</div>
            <div className="cg-card-preview-desc">{game.description}</div>
            {!game.isPlayable && (
                <div className="cg-card-coming">Coming Soon</div>
            )}
        </motion.div>
    );
}

// ---------- Player Stats Bar ----------

function PlayerStatsBar() {
    const globalGame = useGlobalGame();
    const stats = globalGame.stats["blackjack"] || {
        wins: 0,
        losses: 0,
        draws: 0,
    };
    return (
        <div className="cg-statsbar">
            <span className="cg-avatar">👤</span>
            <span>
        <b style={{ fontSize: 19 }}>{globalGame.playerName}</b>
        <br />
        <span style={{ fontSize: 15, opacity: 0.7 }}>
          Chips: ${globalGame.chips}
        </span>
      </span>
            <span style={{ flex: 1 }}></span>
            <span style={{ textAlign: "right", fontSize: 14, opacity: 0.8 }}>
        Blackjack:
        <br />
        <span style={{ opacity: 0.75 }}>
          W: {stats.wins}, L: {stats.losses}, D: {stats.draws}
        </span>
      </span>
        </div>
    );
}

// ---------- Game Container ----------

function GameContainerView({ gameType }) {
    const navigation = useNavigation();
    if (gameType === "blackjack")
        return <BlackjackGame onBack={navigation.goHome} />;
    return <PlaceholderGameView gameKey={gameType} />;
}

function PlaceholderGameView({ gameKey }) {
    const navigation = useNavigation();
    const game = getGameTypeByKey(gameKey);
    return (
        <div
            style={{
                minHeight: 400,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <h2 style={{ fontSize: 32, fontWeight: "bold" }}>{game.displayName}</h2>
            <p style={{ fontSize: 22, margin: "20px 0" }}>
                This game will be available soon!
            </p>
            <button
                onClick={navigation.goHome}
                className="cg-btn"
            >
                Back to Home
            </button>
        </div>
    );
}

