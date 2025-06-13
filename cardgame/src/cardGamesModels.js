// cardGamesModels.js
// All core card game model types: Suit, Rank, PlayingCard, Deck, Hand, etc.

// ----- SUIT -----
export const SUITS = [
    {
        key: "spades",
        symbol: "♠",
        color: "black",
        assetSuffix: "spades",
    },
    {
        key: "hearts",
        symbol: "♥",
        color: "red",
        assetSuffix: "hearts",
    },
    {
        key: "diamonds",
        symbol: "♦",
        color: "red",
        assetSuffix: "diamonds",
    },
    {
        key: "clubs",
        symbol: "♣",
        color: "black",
        assetSuffix: "clubs",
    },
];
export function getSuitByKey(key) {
    return SUITS.find((s) => s.key === key);
}

// ----- RANK -----
export const RANKS = [
    { key: "ace", display: "A", value: 11, raw: "ace" },
    { key: "2", display: "2", value: 2, raw: "2" },
    { key: "3", display: "3", value: 3, raw: "3" },
    { key: "4", display: "4", value: 4, raw: "4" },
    { key: "5", display: "5", value: 5, raw: "5" },
    { key: "6", display: "6", value: 6, raw: "6" },
    { key: "7", display: "7", value: 7, raw: "7" },
    { key: "8", display: "8", value: 8, raw: "8" },
    { key: "9", display: "9", value: 9, raw: "9" },
    { key: "10", display: "10", value: 10, raw: "10" },
    { key: "jack", display: "J", value: 10, raw: "jack" },
    { key: "queen", display: "Q", value: 10, raw: "queen" },
    { key: "king", display: "K", value: 10, raw: "king" },
];
export function getRankByKey(key) {
    return RANKS.find((r) => r.key === key);
}

// ----- PLAYING CARD -----
export function createPlayingCard(suit, rank, isFaceUp = true, isDealt = false) {
    return {
        id: `${rank.key}-${suit.key}-${Math.random().toString(36).substr(2, 9)}`,
        suit,
        rank,
        isFaceUp,
        isDealt,
        assetName: `${rank.raw}_of_${suit.assetSuffix}`,
        altText: `${rank.display} of ${suit.key.charAt(0).toUpperCase() + suit.key.slice(1)}`,
    };
}
export const CARD_BACK_NAME = "card_back";

// ----- HAND -----
export function createHand(cards = []) {
    return {
        cards: [...cards],
        add(card) {
            this.cards.push(card);
        },
        value() {
            let total = this.cards.reduce((acc, c) => acc + c.rank.value, 0);
            let aces = this.cards.filter((c) => c.rank.key === "ace").length;
            while (total > 21 && aces > 0) {
                total -= 10;
                aces -= 1;
            }
            return total;
        },
        isBusted() {
            return this.value() > 21;
        },
        isBlackjack() {
            return this.cards.length === 2 && this.value() === 21;
        },
        isSoft() {
            let total = this.cards.reduce((acc, c) => acc + c.rank.value, 0);
            let aces = this.cards.filter((c) => c.rank.key === "ace").length;
            return aces > 0 && total <= 21;
        },
        description() {
            return this.cards.map((c) => c.rank.display + c.suit.symbol).join(" ");
        },
    };
}

// ----- DECK -----
export function createDeck(shuffled = true) {
    let cards = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            cards.push(createPlayingCard(suit, rank));
        }
    }
    if (shuffled) cards = shuffle(cards);
    return {
        cards,
        shuffle() {
            this.cards = shuffle(this.cards);
        },
        draw(faceUp = true) {
            if (this.cards.length === 0) return null;
            const card = { ...this.cards.shift(), isFaceUp: faceUp };
            return card;
        },
        isEmpty() {
            return this.cards.length === 0;
        },
    };
}

// ----- Utility -----
export function shuffle(array) {
    let a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}