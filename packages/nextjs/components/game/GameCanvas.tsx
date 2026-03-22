"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────
interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "bankero" | "alien";
  baseY: number;
  phase: number;
}
interface Coin {
  x: number;
  y: number;
  collected: boolean;
  collectAnim: number;
}
interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  brightness: number;
}
interface TFQuestion {
  q: string;
  answer: boolean;
}
interface TriviaState {
  active: boolean;
  currentQ: TFQuestion | null;
  questionShownAt: number; // when question text appeared
  portalsShownAt: number; // when portals appeared (10s after question)
  answered: boolean;
  wasCorrect: boolean;
  resultUntil: number;
}
interface Portal {
  x: number;
  y: number;
  radius: number;
  isTrue: boolean;
  active: boolean;
}
interface Bot {
  name: string;
  color: string;
  distance: number;
  y: number;
  speed: number;
  alive: boolean;
}
interface FloatingText {
  text: string;
  x: number;
  y: number;
  color: string;
  spawnTime: number;
  duration: number;
}
interface ScreenFlash {
  color: string;
  startTime: number;
  duration: number;
}
interface LevelConfig {
  level: number;
  founder: string;
  targetDist: number;
  baseSpeed: number;
}

type GameState =
  | "tap_to_enter"
  | "menu"
  | "level_intro"
  | "playing"
  | "level_complete"
  | "level_transition"
  | "game_complete"
  | "gameover";

// ── Constants ──────────────────────────────────────────
const GRAVITY = 0.5;
const JETPACK_FORCE = -8;
const PLAYER_W = 40;
const PLAYER_H = 40;
const PLAYER_X_RATIO = 0.18;
const SCROLL_ACCELERATION = 0.00005;
const COIN_RADIUS = 12;
const COIN_SCORE = 10;
const MAX_LIVES = 5;
const INVULN_DURATION = 1500;
const OBSTACLE_SPAWN_MIN = 1400;
const OBSTACLE_SPAWN_MAX = 2600;
const COIN_SPAWN_INTERVAL = 1800;
const STAR_COUNT_L1 = 60;
const STAR_COUNT_L2 = 30;
const TRIVIA_QUESTION_SHOW = 10000; // question visible 10s before portals
const TRIVIA_PORTAL_DURATION = 5000;
const CORRECT_IMMUNITY = 5000;
const CORRECT_SPEED_MUL = 1.5;
const CORRECT_SCORE = 50;
const WRONG_SPEED_MUL = 0.7;
const WRONG_DURATION = 5000;
const PORTAL_RADIUS = 40;
const COIN_DOUBLE_DURATION = 5000;
const BOT_NAMES = ["CryptoKid", "HODLer", "DeFiDegen", "MoonBoy"];
const BOT_COLORS = ["#ff4466", "#4488ff", "#ffcc00", "#cc44ff"];

const LEVELS: LevelConfig[] = [
  { level: 1, founder: "Satoshi Nakamoto", targetDist: 500, baseSpeed: 2.5 },
  { level: 2, founder: "Vitalik Buterin", targetDist: 800, baseSpeed: 3.5 },
  { level: 3, founder: "Gavin Wood", targetDist: 1200, baseSpeed: 4.5 },
  { level: 4, founder: "Charles Hoskinson", targetDist: 1800, baseSpeed: 5.5 },
  { level: 5, founder: "CZ", targetDist: 2500, baseSpeed: 7 },
];

// ── Question Bank (True/False) ─────────────────────────
const QUESTIONS: TFQuestion[] = [
  { q: "Bitcoin was created by Satoshi Nakamoto", answer: true },
  { q: "Ethereum is a cryptocurrency", answer: true },
  { q: "Bitcoin has unlimited supply", answer: false },
  { q: "A wallet stores your crypto inside it", answer: false },
  { q: "NFT stands for Non-Fungible Token", answer: true },
  { q: "Mining requires solving math problems", answer: true },
  { q: "Avalanche is a Layer 2 solution", answer: false },
  { q: "Smart contracts can execute automatically", answer: true },
  { q: "DeFi stands for Digital Finance", answer: false },
  { q: "You need a bank account to use crypto", answer: false },
  { q: "A blockchain is a type of database", answer: true },
  { q: "Ethereum was created by Vitalik Buterin", answer: true },
  { q: "All cryptocurrencies are Bitcoin", answer: false },
  { q: "Gas fees pay for blockchain transactions", answer: true },
  { q: "A private key should be shared with friends", answer: false },
  { q: "Staking means locking tokens to earn rewards", answer: true },
  { q: "Bitcoin launched in 2015", answer: false },
  { q: "DAOs are controlled by a single CEO", answer: false },
  { q: "Solidity is used to write smart contracts", answer: true },
  { q: "HODL means Hold On for Dear Life", answer: true },
  { q: "You can lose crypto if you lose your seed phrase", answer: true },
  { q: "Polygon is a Layer 2 scaling solution", answer: true },
  { q: "1 Bitcoin can be divided into smaller units", answer: true },
  { q: "Proof of Work requires no energy", answer: false },
  { q: "A DEX needs a middleman to trade", answer: false },
  { q: "Chainlink provides data to smart contracts", answer: true },
  { q: "Web3 means the decentralized internet", answer: true },
  { q: "All crypto transactions are anonymous", answer: false },
  { q: "An airdrop means free token distribution", answer: true },
  { q: "The Ethereum merge switched to Proof of Stake", answer: true },
];

// ── Audio Manager (strict single-track, no overlapping) ─
class AudioManager {
  private sounds: Record<string, HTMLAudioElement | null> = {};
  private loaded = false;
  private started = false;
  private currentTrack: string | null = null;

  load() {
    if (typeof window === "undefined" || this.loaded) return;
    this.loaded = true;
    try {
      const files: Record<string, { src: string; loop: boolean; vol: number }> = {
        intro: { src: "/audio/intro.mp3", loop: true, vol: 0.3 },
        playing: { src: "/audio/playing.mp3", loop: true, vol: 0.3 },
        gameover: { src: "/audio/gameover.mp3", loop: false, vol: 0.5 },
        winner: { src: "/audio/winner.mp3", loop: false, vol: 0.5 },
        sfx_coin: { src: "/audio/money.mp3", loop: false, vol: 0.5 },
        sfx_wrong: { src: "/audio/death.mp3", loop: false, vol: 0.5 },
      };
      for (const [key, cfg] of Object.entries(files)) {
        try {
          const a = new window.Audio(cfg.src);
          a.preload = "auto";
          a.loop = cfg.loop;
          a.volume = cfg.vol;
          this.sounds[key] = a;
        } catch {
          this.sounds[key] = null;
        }
      }
    } catch {}
  }

  userStart() {
    if (typeof window === "undefined" || this.started) return;
    this.started = true;
    try {
      const AC =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ac = new AC();
        ac.resume().catch(() => {});
      }
    } catch {}
  }

  paused = false; // flag to block audio during modal interactions

  // Play a music track. ALWAYS stops everything first. Only one track at a time.
  playTrack(name: string) {
    if (typeof window === "undefined" || this.paused) return;
    if (name === this.currentTrack) return; // already playing
    this.stopAll(); // STOP everything before playing new track
    this.currentTrack = name;
    const s = this.sounds[name];
    if (s) {
      try {
        s.currentTime = 0;
        s.volume = 0.3;
        s.play().catch(() => {});
      } catch {}
    }
  }

  stopAll() {
    if (typeof window === "undefined") return;
    for (const s of Object.values(this.sounds)) {
      if (s) {
        try {
          s.pause();
          s.currentTime = 0;
          s.volume = 0.3;
        } catch {}
      }
    }
    this.currentTrack = null;
  }

  play(name: string) {
    if (typeof window === "undefined") return;
    const s = this.sounds[name];
    if (!s) return;
    try {
      s.currentTime = 0;
      s.play().catch(() => {});
    } catch {}
  }
}

// ── Exports ────────────────────────────────────────────
export interface GameOverData {
  score: number;
  distance: number;
  correctAnswers: number;
  triviaCount: number;
  maxStreak: number;
  level: number;
  totalTime: number;
  botScores: [number, number, number, number];
  botDistances: [number, number, number, number];
}

interface GameCanvasProps {
  walletAddress?: string;
  onGameOver?: (data: GameOverData) => void;
  leaderboardScores?: number[];
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onSaveScore?: () => void;
  onViewLeaderboard?: () => void;
  onConnectWallet?: () => void;
}

export const GameCanvas = ({
  walletAddress,
  onGameOver,
  leaderboardScores = [],
  saveStatus = "idle",
  onSaveScore,
  onViewLeaderboard,
  onConnectWallet,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef({
    walletAddress,
    onGameOver,
    leaderboardScores,
    saveStatus,
    onSaveScore,
    onViewLeaderboard,
    onConnectWallet,
  });
  propsRef.current = {
    walletAddress,
    onGameOver,
    leaderboardScores,
    saveStatus,
    onSaveScore,
    onViewLeaderboard,
    onConnectWallet,
  };
  const audioRef = useRef<AudioManager | null>(null);
  if (typeof window !== "undefined" && !audioRef.current) audioRef.current = new AudioManager();
  const [showSplash, setShowSplash] = useState(true);
  const splashDismissed = useRef(false); // shared flag between React and game loop
  const gameOverBtns = useRef({
    save: { x: 0, y: 0, w: 0, h: 0 },
    leaderboard: { x: 0, y: 0, w: 0, h: 0 },
    restart: { x: 0, y: 0, w: 0, h: 0 },
  });

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = Math.min(window.innerWidth - 16, 1200);
    canvas.height = Math.min(window.innerHeight - 100, 600);
  }, []);

  const initStars = useCallback((w: number, h: number) => {
    const mk = (n: number, sp: number): Star[] =>
      Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.5,
        speed: (Math.random() * 0.5 + 0.3) * sp,
        brightness: Math.random() * 0.6 + 0.4,
      }));
    return { l1: mk(STAR_COUNT_L1, 1), l2: mk(STAR_COUNT_L2, 2.5) };
  }, []);

  const aabb = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  const spawnObs = useCallback((cw: number, ch: number): Obstacle => {
    const t = Math.random() < 0.5 ? ("bankero" as const) : ("alien" as const);
    const w = t === "bankero" ? 40 : 35;
    const h = t === "bankero" ? 60 : 50;
    const y = Math.random() * (ch - h - 60) + 30;
    return { x: cw + 20, y, width: w, height: h, type: t, baseY: y, phase: Math.random() * Math.PI * 2 };
  }, []);

  const spawnCoins = useCallback((cw: number, ch: number): Coin[] => {
    const coins: Coin[] = [];
    const sx = cw + 40;
    const p = Math.random();
    if (p < 0.4) {
      const y = Math.random() * (ch - 80) + 40;
      for (let i = 0; i < 5; i++) coins.push({ x: sx + i * 35, y, collected: false, collectAnim: 0 });
    } else if (p < 0.7) {
      const by = ch * 0.3 + Math.random() * ch * 0.3;
      for (let i = 0; i < 6; i++)
        coins.push({ x: sx + i * 35, y: by - Math.sin((i / 5) * Math.PI) * 80, collected: false, collectAnim: 0 });
    } else {
      const up = Math.random() < 0.5;
      const by = up ? ch * 0.6 : ch * 0.2;
      for (let i = 0; i < 5; i++)
        coins.push({ x: sx + i * 35, y: by + (up ? -1 : 1) * i * 30, collected: false, collectAnim: 0 });
    }
    return coins;
  }, []);

  const shuffle = (arr: number[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ── Pixel helper ─────────────────────────────────────
  const px = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.floor(x), Math.floor(y), s, s);
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // ── Responsive text helpers ────────────────────────
  const fs = (base: number, cw: number) => Math.max(Math.round(base * (cw / 800)), Math.round(base * 0.55));
  const btnW = (cw: number) => Math.min(280, Math.round(cw * 0.8));

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) => {
    const words = text.split(" ");
    let line = "";
    let ly = y;
    for (const word of words) {
      const test = line + (line ? " " : "") + word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, ly);
        line = word;
        ly += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, ly);
  };

  const glowText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    color: string,
    glow: string,
    font: string,
  ) => {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.shadowColor = glow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  // ── Draw functions ───────────────────────────────────
  const drawStars = (ctx: CanvasRenderingContext2D, stars: Star[], dt: number, sm: number) => {
    const w = ctx.canvas.width;
    for (const s of stars) {
      s.x -= s.speed * sm * dt * 60;
      if (s.x < 0) {
        s.x = w;
        s.y = Math.random() * ctx.canvas.height;
      }
      const tw = (Math.sin(s.x * 0.1 + Date.now() * 0.003) + 1) * 0.5;
      ctx.globalAlpha = s.brightness * (0.5 + tw * 0.5);
      const sz = Math.max(1, Math.floor(s.size));
      ctx.fillStyle = s.size > 1.5 ? "#aaccff" : "#fff";
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), sz, sz);
      if (s.size > 1.8 && tw > 0.7) {
        ctx.globalAlpha *= 0.4;
        ctx.fillRect(Math.floor(s.x) - 1, Math.floor(s.y), 3, 1);
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y) - 1, 1, 3);
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    invuln: boolean,
    time: number,
    jetOn: boolean,
  ) => {
    if (invuln && Math.floor(time / 100) % 2 === 0) ctx.globalAlpha = 0.3;
    const bx = Math.floor(x),
      by = Math.floor(y);
    const bob = jetOn ? 0 : Math.sin(time * 0.006) * 2;
    const dy = Math.floor(bob);
    const s = 2;
    // Helmet
    px(ctx, bx + 10, by + dy, s * 2, "#ccccdd");
    for (let i = 0; i < 5; i++) px(ctx, bx + 6 + i * s * 2, by + 2 + dy, s * 2, "#dddde8");
    px(ctx, bx + 4, by + 4 + dy, s, "#bbbbcc");
    px(ctx, bx + 5, by + 4 + dy, s * 7, "#dddde8");
    px(ctx, bx + 19, by + 4 + dy, s, "#bbbbcc");
    // Visor
    px(ctx, bx + 16, by + 6 + dy, s * 4, "#00d4ff");
    px(ctx, bx + 16, by + 8 + dy, s * 4, "#00b8e0");
    px(ctx, bx + 16, by + 10 + dy, s * 4, "#0099cc");
    px(ctx, bx + 18, by + 6 + dy, s, "#66eeff");
    px(ctx, bx + 4, by + 6 + dy, s * 3, "#ccccdd");
    px(ctx, bx + 4, by + 8 + dy, s * 3, "#bbbbcc");
    px(ctx, bx + 24, by + 6 + dy, s * 2, "#ccccdd");
    // Body
    for (let r = 0; r < 5; r++) px(ctx, bx + 6, by + 14 + r * s + dy, s * 7, "#e8e8f0");
    px(ctx, bx + 14, by + 14 + dy, s, "#00d4ff");
    px(ctx, bx + 14, by + 16 + dy, s, "#00d4ff");
    px(ctx, bx + 14, by + 18 + dy, s, "#00d4ff");
    px(ctx, bx + 4, by + 16 + dy, s, "#ccccdd");
    px(ctx, bx + 4, by + 18 + dy, s, "#ccccdd");
    px(ctx, bx + 22, by + 16 + dy, s * 2, "#ccccdd");
    px(ctx, bx + 8, by + 24 + dy, s * 2, "#aaaabb");
    px(ctx, bx + 16, by + 24 + dy, s * 2, "#aaaabb");
    px(ctx, bx + 8, by + 28 + dy, s * 2, "#666677");
    px(ctx, bx + 16, by + 28 + dy, s * 2, "#666677");
    // Jetpack
    px(ctx, bx - 2, by + 10 + dy, s * 2, "#2255aa");
    px(ctx, bx - 2, by + 12 + dy, s * 2, "#2255aa");
    px(ctx, bx - 2, by + 14 + dy, s * 2, "#1a4488");
    px(ctx, bx - 2, by + 16 + dy, s * 2, "#1a4488");
    px(ctx, bx - 2, by + 18 + dy, s * 2, "#2255aa");
    px(ctx, bx - 1, by + 20 + dy, s, "#334466");
    px(ctx, bx + 1, by + 20 + dy, s, "#334466");
    if (jetOn) {
      const f = Math.floor(time / 60) % 3;
      const fc = ["#ff6600", "#ffaa00", "#ff4400"],
        cc = ["#ffee00", "#ffcc00", "#ffdd00"];
      const fh = 8 + f * 4;
      for (let i = 0; i < fh; i += 2) {
        const fw = Math.max(1, 4 - Math.floor(i / 3));
        px(ctx, bx - 1 - fw / 2 + 2, by + 22 + i + dy, fw, fc[(i + f) % 3]);
      }
      for (let i = 0; i < fh - 4; i += 2) px(ctx, bx, by + 22 + i + dy, 2, cc[(i + f) % 3]);
    }
    ctx.globalAlpha = 1;
  };

  const drawBot = (ctx: CanvasRenderingContext2D, y: number, color: string, time: number) => {
    // Smaller astronaut in given color
    const s = 2,
      by = Math.floor(y);
    ctx.save();
    ctx.scale(0.7, 0.7);
    const sx = 0,
      sy = by / 0.7;
    // Helmet
    px(ctx, sx + 8, sy, s * 3, color);
    for (let i = 0; i < 4; i++) px(ctx, sx + 6 + i * s * 2, sy + 2, s * 2, color);
    // Visor
    px(ctx, sx + 14, sy + 6, s * 3, "#222");
    // Body
    for (let r = 0; r < 4; r++) px(ctx, sx + 6, sy + 12 + r * s, s * 6, color);
    // Flame
    const f = Math.floor(time / 80) % 2;
    px(ctx, sx, sy + 20, 3, f ? "#ff6600" : "#ffaa00");
    ctx.restore();
  };

  const drawObs = (ctx: CanvasRenderingContext2D, obs: Obstacle, time: number) => {
    const s = 2;
    if (obs.type === "bankero") {
      const bx = Math.floor(obs.x),
        by = Math.floor(obs.y);
      px(ctx, bx + 8, by, s * 6, "#1a1a2e");
      px(ctx, bx + 6, by + 2, s * 7, "#1a1a2e");
      px(ctx, bx + 8, by + 6, s * 5, "#e8b888");
      px(ctx, bx + 8, by + 8, s * 5, "#e8b888");
      px(ctx, bx + 10, by + 6, s, "#fff");
      px(ctx, bx + 16, by + 6, s, "#fff");
      px(ctx, bx + 11, by + 7, 1, "#f00");
      px(ctx, bx + 17, by + 7, 1, "#f00");
      px(ctx, bx + 9, by + 5, s * 2, "#1a1a2e");
      px(ctx, bx + 15, by + 5, s * 2, "#1a1a2e");
      px(ctx, bx + 12, by + 10, s * 2, "#922");
      for (let r = 0; r < 6; r++) px(ctx, bx + 4, by + 14 + r * s, s * 8, "#111122");
      px(ctx, bx + 12, by + 14, s * 2, "#fff");
      px(ctx, bx + 12, by + 16, s * 2, "#fff");
      px(ctx, bx + 13, by + 18, s, "#ff2244");
      px(ctx, bx + 13, by + 20, s, "#cc1133");
      px(ctx, bx + 13, by + 22, s, "#ff2244");
      px(ctx, bx + 24, by + 30, s * 4, "#8B6914");
      px(ctx, bx + 24, by + 32, s * 4, "#6B4914");
      px(ctx, bx + 28, by + 31, s, "#fc0");
      px(ctx, bx + 8, by + 26, s * 2, "#111122");
      px(ctx, bx + 16, by + 26, s * 2, "#111122");
      px(ctx, bx + 8, by + 30, s * 2, "#222233");
      px(ctx, bx + 16, by + 30, s * 2, "#222233");
    } else {
      obs.y = obs.baseY + Math.sin(time * 0.003 + obs.phase) * 40;
      const bx = Math.floor(obs.x),
        by = Math.floor(obs.y);
      ctx.globalAlpha = 0.15 + Math.sin(time * 0.005) * 0.05;
      ctx.fillStyle = "#33ff33";
      ctx.beginPath();
      ctx.ellipse(bx + 17, by + 22, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const wb = Math.sin(time * 0.008 + obs.phase) * 3;
      px(ctx, bx + 12 + Math.floor(wb), by - 8, 2, "#33ff33");
      px(ctx, bx + 22 - Math.floor(wb), by - 8, 2, "#33ff33");
      px(ctx, bx + 11 + Math.floor(wb), by - 10, 2, "#ff0");
      px(ctx, bx + 21 - Math.floor(wb), by - 10, 2, "#ff0");
      px(ctx, bx + 13, by - 4, 2, "#22cc22");
      px(ctx, bx + 21, by - 4, 2, "#22cc22");
      for (let r = 0; r < 4; r++) {
        const w = 6 + (r < 2 ? r * 2 : (3 - r) * 2);
        px(ctx, bx + 17 - w, by + r * 2, 2 * w, "#33dd33");
      }
      px(ctx, bx + 4, by + 8, 2 * 13, "#33dd33");
      px(ctx, bx + 6, by + 10, 2 * 11, "#33dd33");
      px(ctx, bx + 8, by + 4, 4, "#000");
      px(ctx, bx + 8, by + 6, 4, "#000");
      px(ctx, bx + 20, by + 4, 4, "#000");
      px(ctx, bx + 20, by + 6, 4, "#000");
      px(ctx, bx + 9, by + 4, 2, "#3f3");
      px(ctx, bx + 21, by + 4, 2, "#3f3");
      px(ctx, bx + 14, by + 10, 4, "#161");
      px(ctx, bx + 10, by + 14, 10, "#2b2");
      px(ctx, bx + 12, by + 16, 6, "#2b2");
      px(ctx, bx + 6, by + 14, 2, "#2b2");
      px(ctx, bx + 24, by + 14, 2, "#2b2");
      px(ctx, bx + 12, by + 20, 2, "#2b2");
      px(ctx, bx + 20, by + 20, 2, "#2b2");
    }
  };

  const drawCoin = (ctx: CanvasRenderingContext2D, coin: Coin, time: number) => {
    if (coin.collected) {
      if (coin.collectAnim > 0) {
        const pr = 1 - coin.collectAnim / 10;
        ctx.globalAlpha = coin.collectAnim / 10;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + time * 0.01,
            d = pr * 25;
          ctx.fillStyle = i % 2 === 0 ? "#fc0" : "#fe6";
          ctx.fillRect(Math.floor(coin.x + Math.cos(a) * d), Math.floor(coin.y + Math.sin(a) * d), 2, 2);
        }
        ctx.globalAlpha = 1;
      }
      return;
    }
    const frame = Math.floor(time * 0.004) % 4;
    const widths = [1, 0.6, 0.2, 0.6];
    const sq = widths[frame],
      r = COIN_RADIUS,
      hw = r * sq;
    ctx.fillStyle = "#daa520";
    ctx.fillRect(Math.floor(coin.x - hw), Math.floor(coin.y - r), Math.ceil(hw * 2), Math.ceil(r * 2));
    ctx.fillStyle = "#fc0";
    ctx.fillRect(
      Math.floor(coin.x - hw + 1),
      Math.floor(coin.y - r + 1),
      Math.max(1, Math.ceil(hw * 2 - 2)),
      Math.ceil(r * 2 - 2),
    );
    if (sq > 0.4) {
      ctx.fillStyle = "#fe8";
      ctx.fillRect(
        Math.floor(coin.x - hw + 2),
        Math.floor(coin.y - r + 2),
        Math.max(1, Math.ceil(hw - 2)),
        Math.ceil(r - 2),
      );
    }
    if (sq > 0.3) {
      ctx.fillStyle = "#b8860b";
      ctx.font = `bold ${Math.max(8, Math.floor(r * sq))}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("\u20bf", coin.x, coin.y + 1);
      ctx.textBaseline = "alphabetic";
    }
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    const s = Math.max(1, Math.floor(size / 4)),
      ox = cx - s * 4,
      oy = cy - s * 2,
      c = ctx.fillStyle as string;
    const rows = [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
    ];
    for (let r = 0; r < rows.length; r++)
      for (let col = 0; col < 8; col++)
        if (rows[r][col]) {
          ctx.fillStyle = c;
          ctx.fillRect(ox + col * s, oy + r * s, s, s);
        }
  };

  const drawPortal = (ctx: CanvasRenderingContext2D, x: number, y: number, isTrue: boolean, time: number) => {
    const color = isTrue ? "#33ff66" : "#ff3344";
    const glowColor = isTrue ? "rgba(51,255,102," : "rgba(255,51,68,";
    // Outer glow
    const pulse = 0.3 + Math.sin(time * 0.005) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, PORTAL_RADIUS + 12, 0, Math.PI * 2);
    ctx.fill();
    // Middle ring
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = glowColor + "0.3)";
    ctx.beginPath();
    ctx.arc(x, y, PORTAL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    // Inner core
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, PORTAL_RADIUS - 10, 0, Math.PI * 2);
    ctx.fill();
    // Swirl effect
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    const angle = time * 0.003;
    ctx.beginPath();
    ctx.arc(x, y, PORTAL_RADIUS - 18, angle, angle + Math.PI * 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, PORTAL_RADIUS - 25, angle + Math.PI, angle + Math.PI * 2.2);
    ctx.stroke();
    // Label
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isTrue ? "TRUE" : "FALSE", x, y);
    ctx.textBaseline = "alphabetic";
  };

  const drawFounderCage = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string, time: number) => {
    // Cage glow
    const glow = 0.3 + Math.sin(time * 0.004) * 0.1;
    ctx.globalAlpha = glow;
    ctx.fillStyle = "#ffcc00";
    ctx.fillRect(x - 4, y - 4, 48, 58);
    ctx.globalAlpha = 1;
    // Cage bars
    ctx.fillStyle = "#666";
    ctx.fillRect(x, y, 40, 50);
    ctx.fillStyle = "#111";
    ctx.fillRect(x + 3, y + 3, 34, 44);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "#888";
      ctx.fillRect(x + 3 + i * 8, y, 2, 50);
    }
    // Character inside
    ctx.fillStyle = "#e8b888";
    ctx.fillRect(x + 14, y + 10, 12, 10); // head
    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 12, y + 22, 16, 16); // body
    // Help text
    ctx.fillStyle = "#ffcc00";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HELP!", x + 20, y - 6);
    ctx.fillStyle = "#aaa";
    ctx.font = "9px monospace";
    ctx.fillText(name.split(" ")[0], x + 20, y + 56);
  };

  const drawBg = (ctx: CanvasRenderingContext2D, o1: number, o2: number) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    ctx.fillStyle = "#060612";
    ctx.fillRect(0, 0, w, h);
    // Ceiling
    ctx.fillStyle = "#0e0e28";
    ctx.fillRect(0, 0, w, 24);
    ctx.fillStyle = "#0a0a20";
    ctx.fillRect(0, 24, w, 2);
    const pw2 = 80,
      of2 = o2 % pw2;
    for (let x = -of2; x < w + pw2; x += pw2) {
      ctx.fillStyle = "#161638";
      ctx.fillRect(Math.floor(x), 0, 2, 24);
    }
    const ls = 40,
      lo = o2 % ls;
    for (let x = -lo; x < w + ls; x += ls) {
      ctx.globalAlpha = 0.3 + (Math.sin(x * 0.05 + Date.now() * 0.002) + 1) * 0.25;
      ctx.fillStyle = "#00d4ff";
      ctx.fillRect(Math.floor(x), 22, 8, 2);
      ctx.globalAlpha = 1;
    }
    // Floor
    ctx.fillStyle = "#0e0e28";
    ctx.fillRect(0, h - 40, w, 40);
    ctx.fillStyle = "#0a0a20";
    ctx.fillRect(0, h - 42, w, 2);
    const pw1 = 120,
      of1 = o1 % pw1;
    for (let x = -of1; x < w + pw1; x += pw1) {
      ctx.fillStyle = "#161638";
      ctx.fillRect(Math.floor(x), h - 40, 2, 40);
      ctx.fillStyle = "#222244";
      ctx.fillRect(Math.floor(x) + 4, h - 36, 2, 2);
    }
    for (let x = -lo; x < w + ls; x += ls) {
      ctx.globalAlpha = 0.3 + (Math.sin(x * 0.04 + Date.now() * 0.0015) + 1) * 0.2;
      ctx.fillStyle = "#ffaa00";
      ctx.fillRect(Math.floor(x + 20), h - 42, 8, 2);
      ctx.globalAlpha = 1;
    }
    // Pipes
    const ps = 250,
      po = o1 % ps;
    for (let x = -po; x < w + ps; x += ps) {
      const pxp = Math.floor(x);
      ctx.fillStyle = "#12123a";
      ctx.fillRect(pxp - 2, 26, 6, h - 68);
      ctx.fillStyle = "#1a1a44";
      ctx.fillRect(pxp - 1, 26, 2, h - 68);
      ctx.fillStyle = "#222250";
      ctx.fillRect(pxp - 5, 50, 12, 6);
      ctx.fillRect(pxp - 5, h - 90, 12, 6);
      ctx.fillStyle = Math.sin(pxp * 0.3 + Date.now() * 0.003) > 0 ? "#3f6" : "#132";
      ctx.fillRect(pxp + 5, 52, 3, 2);
    }
    // Windows
    const ws = 400,
      wo = o1 % ws;
    for (let x = -wo + 100; x < w + ws; x += ws) {
      const wx = Math.floor(x),
        wy = Math.floor(h * 0.35);
      ctx.fillStyle = "#1a1a44";
      ctx.fillRect(wx - 2, wy - 2, 54, 34);
      ctx.fillStyle = "#080818";
      ctx.fillRect(wx, wy, 50, 30);
      ctx.fillStyle = "#fff";
      ctx.fillRect(wx + 8, wy + 6, 1, 1);
      ctx.fillRect(wx + 22, wy + 14, 1, 1);
      ctx.fillRect(wx + 38, wy + 8, 2, 1);
      ctx.fillStyle = "#2a2a55";
      ctx.fillRect(wx - 2, wy - 2, 54, 2);
      ctx.fillRect(wx - 2, wy + 30, 54, 2);
    }
    ctx.fillStyle = "#0f0f30";
    ctx.fillRect(0, Math.floor(h * 0.22), w, 2);
    ctx.fillRect(0, Math.floor(h * 0.7), w, 2);
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, g: ReturnType<typeof mkGame>) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    ctx.save();
    const hf = (b: number) => fs(b, w); // HUD font shorthand
    // Score
    ctx.fillStyle = "#fc0";
    ctx.beginPath();
    ctx.arc(24, 24, hf(10), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b8860b";
    ctx.font = `bold ${hf(9)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u20bf", 24, 25);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${hf(18)}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(`${g.score}`, 38, 30);
    // Timer
    const ms = g.totalTime,
      mins = Math.floor(ms / 60000),
      secs = Math.floor((ms % 60000) / 1000),
      centi = Math.floor((ms % 1000) / 10);
    ctx.fillStyle = "#ddeeff";
    ctx.font = `bold ${hf(14)}px monospace`;
    ctx.textAlign = "left";
    ctx.fillText(
      `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centi).padStart(2, "0")}`,
      Math.min(120, w * 0.15),
      30,
    );
    // Race position
    const racePos = g.bots.filter(b => b.distance > g.levelDist).length + 1;
    const suffix = racePos === 1 ? "st" : racePos === 2 ? "nd" : racePos === 3 ? "rd" : "th";
    ctx.fillStyle = racePos === 1 ? "#fc0" : "#8899bb";
    ctx.font = `bold ${hf(12)}px monospace`;
    ctx.fillText(`${racePos}${suffix} of 5`, Math.min(120, w * 0.15), 48);
    // Hearts
    const heartSp = Math.min(28, w * 0.04);
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.fillStyle = i < g.lives ? "#ff3366" : "#333355";
      drawHeart(ctx, w - 24 - i * heartSp, 24, Math.min(10, w * 0.015));
    }
    // Founder distance - simple and correct
    const lvl = LEVELS[g.currentLevel];
    const playerXhud = w * PLAYER_X_RATIO;
    let remaining: number;
    if (g.founderSpawned && g.founderX < w + 100) {
      // Founder visible or near screen: use pixel distance
      const pixDist = g.founderX - playerXhud;
      remaining = pixDist > 0 ? Math.max(1, Math.round(pixDist / 6)) : 0;
    } else {
      // Use pre-computed total distance minus distance traveled
      remaining = Math.max(1, Math.round(g.founderTotalDist - g.levelDist));
    }
    ctx.textAlign = "right";
    ctx.fillStyle = remaining < 50 ? "#fc0" : "#8899bb";
    ctx.font = `bold ${hf(12)}px monospace`;
    ctx.fillText(`${lvl.founder.split(" ")[0]}: ${remaining}m`, w - 20, 62);
    const p = propsRef.current;
    if (p.walletAddress) {
      ctx.fillStyle = "#556688";
      ctx.font = `${hf(10)}px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(p.walletAddress.slice(0, 6) + "..." + p.walletAddress.slice(-4), 10, h - 48);
    }
    // Race position bar (right side)
    const barX = w - 14,
      barTop = 80,
      barH = h - 160;
    ctx.fillStyle = "#111133";
    ctx.fillRect(barX - 3, barTop, 6, barH);
    // Player dot (progress based on founderTotalDist, not targetDist)
    const progressBase = g.founderTotalDist > 0 ? g.founderTotalDist : lvl.targetDist;
    const pProg = Math.min(1, g.levelDist / progressBase);
    ctx.fillStyle = "#00d4ff";
    ctx.fillRect(barX - 5, barTop + barH * (1 - pProg) - 3, 10, 6);
    // Bot dots
    for (const bot of g.bots) {
      const bProg = Math.min(1, bot.distance / progressBase);
      ctx.fillStyle = bot.color;
      ctx.fillRect(barX - 3, barTop + barH * (1 - bProg) - 2, 6, 4);
    }
    // Finish line
    ctx.fillStyle = "#fc0";
    ctx.fillRect(barX - 6, barTop - 2, 12, 2);
    ctx.restore();
  };

  const drawFloats = (ctx: CanvasRenderingContext2D, texts: FloatingText[], now: number) => {
    for (let i = texts.length - 1; i >= 0; i--) {
      const f = texts[i],
        el = now - f.spawnTime;
      if (el > f.duration) {
        texts.splice(i, 1);
        continue;
      }
      const pr = el / f.duration;
      ctx.globalAlpha = 1 - pr;
      ctx.fillStyle = f.color;
      ctx.font = `bold ${fs(22, ctx.canvas.width)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y - pr * 50);
    }
    ctx.globalAlpha = 1;
  };

  const drawFlash = (ctx: CanvasRenderingContext2D, flash: ScreenFlash | null, now: number) => {
    if (!flash) return;
    const el = now - flash.startTime;
    if (el > flash.duration) return;
    ctx.globalAlpha = 0.3 * (1 - el / flash.duration);
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
  };

  // ── Screen draws ─────────────────────────────────────
  const drawMenu = (ctx: CanvasRenderingContext2D) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    ctx.fillStyle = "rgba(4,4,16,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, y, w, 1);
    }
    ctx.globalAlpha = 1;
    glowText(ctx, "SPACE RUNNERS", w / 2, h * 0.26, "#00d4ff", "#00d4ff", `bold ${fs(44, w)}px monospace`);
    glowText(
      ctx,
      "RESCUE THE FOUNDERS",
      w / 2,
      h * 0.26 + fs(44, w),
      "#e94560",
      "#e94560",
      `bold ${fs(20, w)}px monospace`,
    );
    ctx.fillStyle = "#7788aa";
    ctx.font = `${fs(13, w)}px monospace`;
    ctx.textAlign = "center";
    wrapText(ctx, "5 levels \u00b7 5 founders \u00b7 True or False trivia", w / 2, h * 0.46, w * 0.9, fs(18, w));
    ctx.fillText("HOLD to fly \u00b7 RELEASE to fall", w / 2, h * 0.46 + fs(22, w));
    const p = propsRef.current;
    if (p.walletAddress) {
      ctx.fillStyle = "#3f6";
      ctx.font = `${fs(13, w)}px monospace`;
      ctx.fillText("\u2713 " + p.walletAddress.slice(0, 6) + "..." + p.walletAddress.slice(-4), w / 2, h * 0.62);
    } else {
      ctx.fillStyle = "#556677";
      ctx.font = `${fs(12, w)}px monospace`;
      ctx.fillText("Connect wallet to save scores", w / 2, h * 0.62);
    }
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    glowText(ctx, "\u25b6 TAP TO START", w / 2, h * 0.76, "#fc0", "#fc0", `bold ${fs(24, w)}px monospace`);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#334455";
    ctx.font = `${fs(10, w)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("Aleph Hackathon 2026", w / 2, h - fs(14, w));
  };

  const drawLevelIntro = (ctx: CanvasRenderingContext2D, lvl: LevelConfig) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    ctx.fillStyle = "rgba(4,4,16,0.92)";
    ctx.fillRect(0, 0, w, h);
    glowText(ctx, `LEVEL ${lvl.level}`, w / 2, h * 0.3, "#00d4ff", "#00d4ff", `bold ${fs(48, w)}px monospace`);
    glowText(ctx, `Rescue ${lvl.founder}`, w / 2, h * 0.3 + fs(48, w), "#fc0", "#fc0", `bold ${fs(22, w)}px monospace`);
    ctx.fillStyle = "#7788aa";
    ctx.font = `${fs(15, w)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(`Distance: ${lvl.targetDist}m`, w / 2, h * 0.55);
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fs(20, w)}px monospace`;
    ctx.fillText("TAP", w / 2, h * 0.72);
    ctx.globalAlpha = 1;
  };

  // Level complete button hit areas
  const lvlCompleteBtns = useRef({ home: { x: 0, y: 0, w: 0, h: 0 } });

  // Draw a large founder character (pixel art, 60x60)
  const drawFounderBig = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string) => {
    const s = 3;
    // Head (skin)
    ctx.fillStyle = "#e8b888";
    ctx.fillRect(x + 12, y, s * 8, s * 6);
    // Hair
    ctx.fillStyle = "#332211";
    ctx.fillRect(x + 12, y - 2, s * 8, s * 2);
    ctx.fillRect(x + 10, y, s * 2, s * 3);
    // Eyes
    ctx.fillStyle = "#222";
    ctx.fillRect(x + 16, y + s * 2, s, s);
    ctx.fillRect(x + 24, y + s * 2, s, s);
    // Smile
    ctx.fillStyle = "#aa5533";
    ctx.fillRect(x + 18, y + s * 4, s * 3, 2);
    // Body (white shirt)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 8, y + s * 6, s * 10, s * 7);
    // Suit jacket
    ctx.fillStyle = "#334466";
    ctx.fillRect(x + 6, y + s * 6, s * 2, s * 7);
    ctx.fillRect(x + 8 + s * 8, y + s * 6, s * 2, s * 7);
    // Arms
    ctx.fillStyle = "#334466";
    ctx.fillRect(x + 2, y + s * 7, s * 2, s * 5);
    ctx.fillRect(x + 8 + s * 10, y + s * 7, s * 2, s * 5);
    // Legs
    ctx.fillStyle = "#222233";
    ctx.fillRect(x + 12, y + s * 13, s * 3, s * 4);
    ctx.fillRect(x + 20, y + s * 13, s * 3, s * 4);
    // Name label
    ctx.fillStyle = "#fc0";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(name, x + 20, y - 10);
  };

  // Celebration particles
  const drawCelebration = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const t = Date.now();
    for (let i = 0; i < 20; i++) {
      const seed = i * 137.5;
      const x = (seed * 7.3 + t * 0.02) % w;
      const y = (seed * 13.1 + t * 0.03) % h;
      const colors = ["#fc0", "#33ff66", "#00d4ff", "#ff66aa", "#ffaa00"];
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.4 + Math.sin(t * 0.005 + i) * 0.3;
      const sz = 2 + (i % 3);
      ctx.fillRect(Math.floor(x), Math.floor(y), sz, sz);
      // Star sparkle on some
      if (i % 4 === 0) {
        ctx.fillRect(Math.floor(x) - 2, Math.floor(y), sz + 4, 1);
        ctx.fillRect(Math.floor(x), Math.floor(y) - 2, 1, sz + 4);
      }
    }
    ctx.globalAlpha = 1;
  };

  const drawLevelComplete = (ctx: CanvasRenderingContext2D, lvl: LevelConfig) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    ctx.fillStyle = "rgba(0,10,0,0.92)";
    ctx.fillRect(0, 0, w, h);
    drawCelebration(ctx, w, h);
    glowText(ctx, "YOU WON!", w / 2, h * 0.15, "#33ff66", "#33ff66", `bold ${fs(46, w)}px monospace`);
    glowText(
      ctx,
      `You rescued ${lvl.founder}!`,
      w / 2,
      h * 0.15 + fs(42, w),
      "#fc0",
      "#fc0",
      `bold ${fs(18, w)}px monospace`,
    );
    // Player (left) and Founder (right) - large, centered
    const cx = w / 2;
    const charY = h * 0.38;
    // Player astronaut (scaled up using transform)
    ctx.save();
    ctx.translate(cx - 70, charY);
    ctx.scale(1.5, 1.5);
    drawPlayer(ctx, 0, 0, false, Date.now(), false);
    ctx.restore();
    // Founder (freed)
    drawFounderBig(ctx, cx + 30, charY, lvl.founder);
    // TAP to continue
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fs(18, w)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("TAP to continue", w / 2, h * 0.76);
    ctx.globalAlpha = 1;
    // HOME button
    const bwLC = btnW(w) * 0.5,
      bhLC = Math.max(36, fs(38, w)),
      bx = w / 2 - bwLC / 2,
      btnYLC = h * 0.82;
    ctx.fillStyle = "#1a1a3a";
    roundRect(ctx, bx, btnYLC, bwLC, bhLC, 8);
    ctx.fill();
    ctx.fillStyle = "#8899bb";
    ctx.font = `bold ${fs(14, w)}px monospace`;
    ctx.fillText("HOME", w / 2, btnYLC + bhLC / 2 + 5);
    lvlCompleteBtns.current.home = { x: bx, y: btnYLC, w: bwLC, h: bhLC };
  };

  // Level transition button hit areas
  const lvlTransBtns = useRef({ home: { x: 0, y: 0, w: 0, h: 0 } });

  const drawLevelTransition = (ctx: CanvasRenderingContext2D, nextLvl: LevelConfig) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height;
    ctx.fillStyle = "rgba(4,4,16,0.92)";
    ctx.fillRect(0, 0, w, h);
    drawCelebration(ctx, w, h);
    glowText(ctx, `Level ${nextLvl.level}`, w / 2, h * 0.14, "#00d4ff", "#00d4ff", `bold ${fs(42, w)}px monospace`);
    glowText(
      ctx,
      `Rescue ${nextLvl.founder}`,
      w / 2,
      h * 0.14 + fs(40, w),
      "#fc0",
      "#fc0",
      `bold ${fs(18, w)}px monospace`,
    );
    const cx = w / 2;
    ctx.save();
    ctx.translate(cx - 90, h * 0.36);
    ctx.scale(1.3, 1.3);
    drawPlayer(ctx, 0, 0, false, Date.now(), true);
    ctx.restore();
    drawFounderCage(ctx, cx + 10, h * 0.38, nextLvl.founder, Date.now());
    ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${fs(18, w)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("TAP to continue", w / 2, h * 0.68);
    ctx.globalAlpha = 1;
    const bwT = btnW(w) * 0.5,
      bhT = Math.max(40, fs(44, w)),
      bxT = w / 2 - bwT / 2,
      byT = h * 0.76;
    ctx.fillStyle = "#1a1a3a";
    roundRect(ctx, bxT, byT, bwT, bhT, 8);
    ctx.fill();
    ctx.fillStyle = "#8899bb";
    ctx.font = `bold ${fs(14, w)}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText("HOME", w / 2, byT + bhT / 2 + 5);
    lvlTransBtns.current.home = { x: bxT, y: byT, w: bwT, h: bhT };
  };

  const drawGameComplete = (ctx: CanvasRenderingContext2D, g: ReturnType<typeof mkGame>) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height,
      p = propsRef.current;
    ctx.fillStyle = "rgba(0,5,0,0.92)";
    ctx.fillRect(0, 0, w, h);
    glowText(ctx, "ALL FOUNDERS RESCUED!", w / 2, h * 0.18, "#fc0", "#fc0", "bold 36px monospace");
    ctx.fillStyle = "#fff";
    ctx.font = "22px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`Score: ${g.score}`, w / 2, h * 0.32);
    const ms = g.totalTime,
      mins = Math.floor(ms / 60000),
      secs = Math.floor((ms % 60000) / 1000);
    ctx.fillText(`Time: ${mins}m ${secs}s`, w / 2, h * 0.32 + 30);
    ctx.fillStyle = "#8899bb";
    ctx.font = "16px monospace";
    ctx.fillText(`Trivia: ${g.correctAnswers}/${g.triviaCount} correct`, w / 2, h * 0.32 + 58);
    const btnW = 220,
      btnH = 44;
    let btnY = h * 0.58;
    if (p.walletAddress && p.onSaveScore) {
      const bx = w / 2 - btnW / 2;
      let label = "SAVE SCORE ONCHAIN",
        bg = "#0a4a2a";
      if (p.saveStatus === "saving") {
        label = "SAVING...";
        bg = "#335";
      } else if (p.saveStatus === "saved") {
        label = "SCORE SAVED!";
        bg = "#0a6e2a";
      } else if (p.saveStatus === "error") {
        label = "ERROR - TAP RETRY";
        bg = "#6e0a0a";
      }
      ctx.fillStyle = bg;
      roundRect(ctx, bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, w / 2, btnY + btnH / 2 + 5);
      gameOverBtns.current.save = { x: bx, y: btnY, w: btnW, h: btnH };
      btnY += btnH + 10;
    }
    {
      const bx = w / 2 - btnW / 2;
      ctx.fillStyle = "#1a2a4a";
      roundRect(ctx, bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.fillStyle = "#00d4ff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VIEW LEADERBOARD", w / 2, btnY + btnH / 2 + 5);
      gameOverBtns.current.leaderboard = { x: bx, y: btnY, w: btnW, h: btnH };
    }
  };

  const drawGameOver = (ctx: CanvasRenderingContext2D, g: ReturnType<typeof mkGame>) => {
    const w = ctx.canvas.width,
      h = ctx.canvas.height,
      p = propsRef.current;
    ctx.fillStyle = "rgba(6,0,0,0.9)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, y, w, 1);
    }
    ctx.globalAlpha = 1;
    glowText(ctx, "MISSION FAILED", w / 2, h * 0.18, "#ff2244", "#f00", "bold 46px monospace");
    ctx.fillStyle = "#fc0";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`\u20bf ${g.score}`, w / 2, h * 0.33);
    ctx.fillStyle = "#8899bb";
    ctx.font = "16px monospace";
    ctx.fillText(
      `Level ${g.currentLevel + 1}  \u00b7  ${Math.floor(g.levelDist)}m  \u00b7  Q:${g.triviaCount}`,
      w / 2,
      h * 0.33 + 28,
    );
    const btnW = 220,
      btnH = 44;
    let btnY = h * 0.5;
    if (p.walletAddress && p.onSaveScore) {
      const bx = w / 2 - btnW / 2;
      let label = "SAVE SCORE ONCHAIN",
        bg = "#0a4a2a";
      if (p.saveStatus === "saving") {
        label = "SAVING...";
        bg = "#335";
      } else if (p.saveStatus === "saved") {
        label = "SCORE SAVED!";
        bg = "#0a6e2a";
      } else if (p.saveStatus === "error") {
        label = "ERROR - TAP RETRY";
        bg = "#6e0a0a";
      }
      ctx.fillStyle = bg;
      roundRect(ctx, bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, w / 2, btnY + btnH / 2 + 5);
      gameOverBtns.current.save = { x: bx, y: btnY, w: btnW, h: btnH };
      btnY += btnH + 10;
    }
    {
      const bx = w / 2 - btnW / 2;
      ctx.fillStyle = "#1a2a4a";
      roundRect(ctx, bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.fillStyle = "#00d4ff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("VIEW LEADERBOARD", w / 2, btnY + btnH / 2 + 5);
      gameOverBtns.current.leaderboard = { x: bx, y: btnY, w: btnW, h: btnH };
      btnY += btnH + 10;
    }
    {
      const bx = w / 2 - btnW / 2;
      ctx.fillStyle = "#2a1a1a";
      roundRect(ctx, bx, btnY, btnW, btnH, 8);
      ctx.fill();
      ctx.globalAlpha = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
      ctx.fillStyle = "#fc0";
      ctx.font = "bold 14px monospace";
      ctx.fillText("TAP TO RESTART", w / 2, btnY + btnH / 2 + 5);
      ctx.globalAlpha = 1;
      gameOverBtns.current.restart = { x: bx, y: btnY, w: btnW, h: btnH };
    }
  };

  // ── Game state factory ───────────────────────────────
  function mkGame(cw: number, ch: number, stars: { l1: Star[]; l2: Star[] }) {
    return {
      state: "tap_to_enter" as GameState,
      playerY: ch / 2 - PLAYER_H / 2,
      velocityY: 0,
      jetpackOn: false,
      score: 0,
      levelDist: 0,
      totalDist: 0,
      lives: MAX_LIVES,
      scrollSpeed: LEVELS[0].baseSpeed,
      speedMul: 1,
      speedMulUntil: 0,
      invulnUntil: 0,
      coinMul: 1,
      coinMulUntil: 0,
      obstacles: [] as Obstacle[],
      coins: [] as Coin[],
      starsL1: stars.l1,
      starsL2: stars.l2,
      lastObsSpawn: 0,
      nextObsDelay: OBSTACLE_SPAWN_MIN,
      lastCoinSpawn: 0,
      lastFrameTime: 0,
      animFrameId: 0,
      gameTime: 0,
      totalTime: 0,
      bgOff1: 0,
      bgOff2: 0,
      currentLevel: 0,
      trivia: {
        active: false,
        currentQ: null,
        questionShownAt: 0,
        portalsShownAt: 0,
        answered: false,
        wasCorrect: false,
        resultUntil: 0,
      } as TriviaState,
      portals: [] as Portal[],
      lastTriviaTime: 0,
      triviaCount: 0,
      correctAnswers: 0,
      maxStreak: 0,
      streak: 0,
      qOrder: shuffle(Array.from({ length: QUESTIONS.length }, (_, i) => i)),
      qIdx: 0,
      bots: BOT_NAMES.map((name, i) => ({
        name,
        color: BOT_COLORS[i],
        distance: 0,
        y: ch * 0.2 + Math.random() * ch * 0.5,
        speed: 0,
        alive: true,
      })) as Bot[],
      floats: [] as FloatingText[],
      flash: null as ScreenFlash | null,
      introTimer: 0,
      // Founder spawning
      allQDone: false,
      founderSpawned: false,
      founderSpawnDist: 0,
      founderTotalDist: 0, // pre-computed: total distance to founder from level start
      founderX: 0,
      founderY: 0,
      founderPassed: false,
      debugCounter: 0,
    };
  }

  // ── Main effect ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    resizeCanvas();
    audioRef.current?.load();
    const stars = initStars(canvas.width, canvas.height);
    const g = mkGame(canvas.width, canvas.height, stars);

    const resetLevel = (levelIdx: number) => {
      const lvl = LEVELS[levelIdx];
      g.currentLevel = levelIdx;
      g.lives = MAX_LIVES; // Reset lives each level
      g.playerY = canvas.height / 2 - PLAYER_H / 2;
      g.velocityY = 0;
      g.jetpackOn = false;
      g.levelDist = 0;
      g.scrollSpeed = lvl.baseSpeed;
      g.speedMul = 1;
      g.speedMulUntil = 0;
      g.invulnUntil = 0;
      g.coinMul = 1;
      g.coinMulUntil = 0;
      g.obstacles = [];
      g.coins = [];
      g.portals = [];
      g.lastObsSpawn = 0;
      g.nextObsDelay = OBSTACLE_SPAWN_MIN;
      g.lastCoinSpawn = 0;
      g.gameTime = 0;
      g.lastFrameTime = 0; // CRITICAL: reset so first frame doesn't have huge dt
      g.bgOff1 = 0;
      g.bgOff2 = 0;
      g.trivia = {
        active: false,
        currentQ: null,
        questionShownAt: 0,
        portalsShownAt: 0,
        answered: false,
        wasCorrect: false,
        resultUntil: 0,
      };
      g.lastTriviaTime = 0;
      g.triviaCount = 0;
      g.allQDone = false;
      g.founderSpawned = false;
      g.founderSpawnDist = 0;
      g.founderX = 0;
      g.founderY = 0;
      g.founderPassed = false;
      g.debugCounter = 0;
      // Pre-compute founder total distance: last question position + 20m
      const qCounts = [1, 2, 3, 4, 5];
      const nq = qCounts[levelIdx] || 3;
      const lastQPos = (lvl.targetDist * nq) / (nq + 1);
      g.founderTotalDist = lastQPos + 20;
      console.log(
        `[Level ${levelIdx + 1}] founderTotalDist=${g.founderTotalDist.toFixed(0)}, targetDist=${lvl.targetDist}`,
      );
      g.floats = [];
      g.flash = null;
      // Reset bots for this level
      g.bots = BOT_NAMES.map((name, i) => ({
        name,
        color: BOT_COLORS[i],
        distance: 0,
        y: canvas.height * 0.2 + Math.random() * canvas.height * 0.5,
        speed: lvl.baseSpeed * (0.7 + Math.random() * 0.5),
        alive: true,
      }));
    };

    const fullReset = () => {
      g.score = 0;
      g.totalDist = 0;
      g.totalTime = 0;
      g.lives = MAX_LIVES;
      g.triviaCount = 0;
      g.correctAnswers = 0;
      g.maxStreak = 0;
      g.streak = 0;
      g.qOrder = shuffle(Array.from({ length: QUESTIONS.length }, (_, i) => i));
      g.qIdx = 0;
      resetLevel(0);
      const s = initStars(canvas.width, canvas.height);
      g.starsL1 = s.l1;
      g.starsL2 = s.l2;
    };

    const nextQ = (): TFQuestion => {
      if (g.qIdx >= g.qOrder.length) {
        g.qOrder = shuffle(Array.from({ length: QUESTIONS.length }, (_, i) => i));
        g.qIdx = 0;
      }
      return QUESTIONS[g.qOrder[g.qIdx++]];
    };

    const fireGameOver = () => {
      propsRef.current.onGameOver?.({
        score: g.score,
        distance: g.totalDist,
        correctAnswers: g.correctAnswers,
        triviaCount: g.triviaCount,
        maxStreak: g.maxStreak,
        level: g.currentLevel + 1,
        totalTime: g.totalTime,
        botScores: [
          Math.floor(g.bots[0]?.distance || 0),
          Math.floor(g.bots[1]?.distance || 0),
          Math.floor(g.bots[2]?.distance || 0),
          Math.floor(g.bots[3]?.distance || 0),
        ],
        botDistances: [
          Math.floor(g.bots[0]?.distance || 0),
          Math.floor(g.bots[1]?.distance || 0),
          Math.floor(g.bots[2]?.distance || 0),
          Math.floor(g.bots[3]?.distance || 0),
        ],
      });
    };

    // ── Input ──────────────────────────────────────────
    const getCP = (cx: number, cy: number) => {
      const r = canvas.getBoundingClientRect();
      return { mx: (cx - r.left) * (canvas.width / r.width), my: (cy - r.top) * (canvas.height / r.height) };
    };
    const hit = (mx: number, my: number, b: { x: number; y: number; w: number; h: number }) =>
      mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h;

    const audio = audioRef.current!;

    const onDown = (e: MouseEvent | Touch, isTouch = false) => {
      audio.userStart(); // unlock audio on first tap
      if (g.state === "tap_to_enter") {
        // tap_to_enter is handled by HTML overlay buttons, ignore canvas taps
        return;
      }
      if (g.state === "menu") {
        fullReset();
        g.state = "level_intro";
        g.introTimer = Date.now();
        g.lastFrameTime = performance.now();
        audio.playTrack("intro");
        return;
      }
      if (g.state === "level_intro") {
        g.state = "playing";
        g.lastFrameTime = performance.now();
        audio.playTrack("playing");
        return;
      }
      if (g.state === "level_complete") {
        const { mx, my } = getCP(e.clientX, e.clientY);
        if (hit(mx, my, lvlCompleteBtns.current.home)) {
          fullReset();
          g.state = "menu";
          audio.playTrack("intro");
          return;
        }
        if (g.currentLevel >= LEVELS.length - 1) {
          g.state = "game_complete";
          fireGameOver();
          audio.playTrack("winner");
        } else {
          g.state = "level_transition";
          audio.playTrack("intro");
        }
        return;
      }
      if (g.state === "level_transition") {
        const { mx, my } = getCP(e.clientX, e.clientY);
        if (hit(mx, my, lvlTransBtns.current.home)) {
          fullReset();
          g.state = "menu";
          audio.playTrack("intro");
          return;
        }
        resetLevel(g.currentLevel + 1);
        g.state = "playing";
        g.lastFrameTime = performance.now();
        audio.playTrack("playing");
        return;
      }
      if (g.state === "game_complete" || g.state === "gameover") {
        const { mx, my } = getCP(e.clientX, e.clientY);
        const btns = gameOverBtns.current;
        if (hit(mx, my, btns.save)) {
          const p = propsRef.current;
          if (p.onSaveScore && p.saveStatus !== "saving" && p.saveStatus !== "saved") p.onSaveScore();
          return;
        }
        if (hit(mx, my, btns.leaderboard)) {
          propsRef.current.onViewLeaderboard?.();
          return;
        }
        if (g.state === "gameover") {
          fullReset();
          g.state = "level_intro";
          g.introTimer = Date.now();
          g.lastFrameTime = performance.now();
          audio.playTrack("intro");
        }
        return;
      }
      if (!isTouch || true) g.jetpackOn = true;
    };
    const onUp = () => {
      g.jetpackOn = false;
    };
    const onMD = (e: MouseEvent) => onDown(e);
    const onTS = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) onDown(e.touches[0], true);
    };
    const onTE = (e: TouchEvent) => {
      e.preventDefault();
      onUp();
    };
    canvas.addEventListener("mousedown", onMD);
    canvas.addEventListener("mouseup", onUp);
    canvas.addEventListener("mouseleave", onUp);
    canvas.addEventListener("touchstart", onTS);
    canvas.addEventListener("touchend", onTE);

    // ── Game loop ──────────────────────────────────────
    const loop = (ts: number) => {
      g.animFrameId = requestAnimationFrame(loop);
      const w = canvas.width,
        h = canvas.height;

      // ── TAP TO ENTER / WALLET CONNECT splash ────────
      // Check if HTML buttons dismissed the splash
      if (g.state === "tap_to_enter" && splashDismissed.current) {
        g.state = "menu";
      }
      if (g.state === "tap_to_enter") {
        ctx.fillStyle = "#040410";
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 0.03;
        for (let sy = 0; sy < h; sy += 3) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, sy, w, 1);
        }
        ctx.globalAlpha = 1;
        glowText(ctx, "SPACE RUNNERS", w / 2, h * 0.22, "#00d4ff", "#00d4ff", `bold ${fs(44, w)}px monospace`);
        ctx.fillStyle = "#7788aa";
        ctx.font = `${fs(14, w)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#7788aa";
        ctx.font = `${fs(13, w)}px monospace`;
        wrapText(ctx, "Create a wallet to save scores", w / 2, h * 0.34, w * 0.9, fs(18, w));
        // Buttons are HTML overlays (required for WebAuthn passkey)
        // Footer
        ctx.fillStyle = "#334455";
        ctx.font = `${fs(11, w)}px monospace`;
        ctx.textAlign = "center";
        ctx.fillText("Aleph Hackathon 2026", w / 2, h - fs(16, w));
        return;
      }

      if (g.state === "menu") {
        drawBg(ctx, 0, 0);
        drawStars(ctx, g.starsL1, 0.016, 0.3);
        drawStars(ctx, g.starsL2, 0.016, 0.6);
        drawMenu(ctx);
        return;
      }
      if (g.state === "level_intro") {
        drawBg(ctx, 0, 0);
        drawStars(ctx, g.starsL1, 0.016, 0.3);
        drawStars(ctx, g.starsL2, 0.016, 0.6);
        drawLevelIntro(ctx, LEVELS[g.currentLevel]);
        return;
      }
      if (g.state === "level_complete") {
        drawBg(ctx, g.bgOff1, g.bgOff2);
        drawStars(ctx, g.starsL1, 0, 0);
        drawStars(ctx, g.starsL2, 0, 0);
        drawLevelComplete(ctx, LEVELS[g.currentLevel]);
        return;
      }
      if (g.state === "level_transition") {
        drawBg(ctx, 0, 0);
        drawStars(ctx, g.starsL1, 0.016, 0.3);
        drawStars(ctx, g.starsL2, 0.016, 0.6);
        drawLevelTransition(ctx, LEVELS[g.currentLevel + 1]);
        return;
      }
      if (g.state === "game_complete") {
        drawBg(ctx, g.bgOff1, g.bgOff2);
        drawStars(ctx, g.starsL1, 0, 0);
        drawStars(ctx, g.starsL2, 0, 0);
        drawGameComplete(ctx, g);
        return;
      }
      if (g.state === "gameover") {
        drawBg(ctx, g.bgOff1, g.bgOff2);
        drawStars(ctx, g.starsL1, 0, 0);
        drawStars(ctx, g.starsL2, 0, 0);
        drawGameOver(ctx, g);
        return;
      }

      // ── PLAYING ──────────────────────────────────────
      if (g.lastFrameTime === 0) g.lastFrameTime = ts;
      const rawDt = (ts - g.lastFrameTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      g.lastFrameTime = ts;
      g.gameTime += dt * 1000;
      g.totalTime += dt * 1000;
      const now = g.gameTime;
      const lvl = LEVELS[g.currentLevel];
      const playerX = w * PLAYER_X_RATIO;

      // Speed
      if (now > g.speedMulUntil) g.speedMul = 1;
      if (now > g.coinMulUntil) g.coinMul = 1;
      g.scrollSpeed = (lvl.baseSpeed + g.gameTime * SCROLL_ACCELERATION) * g.speedMul;

      // Physics
      if (g.jetpackOn) g.velocityY = JETPACK_FORCE;
      else g.velocityY += GRAVITY * dt * 60;
      g.playerY += g.velocityY * dt * 60;
      const minY = 22,
        maxY = h - 42 - PLAYER_H;
      if (g.playerY < minY) {
        g.playerY = minY;
        g.velocityY = 0;
      }
      if (g.playerY > maxY) {
        g.playerY = maxY;
        g.velocityY = 0;
      }

      // Distance (scrollSpeed already includes speedMul from trivia effects)
      // pixelsPerFrame = scrollSpeed * dt * 60
      // metersPerFrame = pixelsPerFrame / 6 = scrollSpeed * dt * 10
      const pixelsThisFrame = g.scrollSpeed * dt * 60;
      const metersThisFrame = pixelsThisFrame / 6;
      g.levelDist += metersThisFrame;
      g.totalDist += metersThisFrame;
      g.score += Math.floor(metersThisFrame);

      // Parallax
      g.bgOff1 += pixelsThisFrame * 0.5;
      g.bgOff2 += pixelsThisFrame * 1.2;

      // ── Check all questions done → spawn founder ──────
      const questionsPerLevel2 = [1, 2, 3, 4, 5];
      const numQForLevel = questionsPerLevel2[g.currentLevel] || 3;
      if (!g.allQDone && g.triviaCount >= numQForLevel && !g.trivia.active) {
        g.allQDone = true;
      }
      // Spawn founder 20m after last question answered
      // Place at exactly 20m ahead in pixel space (6px = 1m)
      if (g.allQDone && !g.founderSpawned) {
        g.founderSpawned = true;
        g.founderSpawnDist = g.levelDist + 20;
        g.founderX = playerX + 20 * 6; // 20 meters * 6 px/m = 120px ahead of player
        g.founderY = h * 0.3 + Math.random() * h * 0.3;
      }
      // Debug log every 120 frames
      g.debugCounter++;
      if (g.debugCounter % 120 === 0 && g.founderTotalDist > 0) {
        const pxd = g.founderSpawned ? g.founderX - playerX : -1;
        console.log(
          `[Dist] founderTotal=${g.founderTotalDist.toFixed(0)} levelDist=${g.levelDist.toFixed(0)} remain=${Math.round(g.founderTotalDist - g.levelDist)} spawned=${g.founderSpawned} fX=${g.founderX.toFixed(0)} pxDist=${pxd.toFixed(0)}`,
        );
      }
      // Move founder left with scroll (same pixel speed as everything else)
      if (g.founderSpawned) {
        g.founderX -= pixelsThisFrame;
        // Level complete when player passes alongside founder (playerX >= founderX)
        if (playerX >= g.founderX && !g.founderPassed) {
          g.founderPassed = true;
          g.state = "level_complete";
          audio.playTrack("intro"); // victory music (stopAll first, then intro)
          return;
        }
      }

      // ── Trivia system (T/F portals) ──────────────────
      const questionsPerLevel = [1, 2, 3, 4, 5];
      const numQ = questionsPerLevel[g.currentLevel] || 3;
      const triviaInterval = lvl.targetDist / (numQ + 1);
      const t = g.trivia;
      if (!t.active && g.levelDist - g.lastTriviaTime > triviaInterval && g.levelDist > 50 && g.triviaCount < numQ) {
        t.active = true;
        t.currentQ = nextQ();
        t.questionShownAt = now;
        t.portalsShownAt = 0;
        t.answered = false;
        t.wasCorrect = false;
        t.resultUntil = 0;
        g.triviaCount++;
        g.lastTriviaTime = g.levelDist;
      }
      if (t.active && !t.answered) {
        // Show portals after 10s - spawn off-screen right, they scroll left
        if (t.portalsShownAt === 0 && now - t.questionShownAt > TRIVIA_QUESTION_SHOW) {
          t.portalsShownAt = now;
          g.portals = [
            { x: w + PORTAL_RADIUS + 20, y: h * 0.25, radius: PORTAL_RADIUS, isTrue: true, active: true },
            { x: w + PORTAL_RADIUS + 20, y: h * 0.72, radius: PORTAL_RADIUS, isTrue: false, active: true },
          ];
        }
        // Move portals left with scroll
        for (const portal of g.portals) {
          if (portal.active) portal.x -= pixelsThisFrame;
        }
        // Portal timeout: dismiss if off-screen left or time expired
        const portalsGone = g.portals.length > 0 && g.portals.every(p => p.x < -PORTAL_RADIUS * 2);
        if (t.portalsShownAt > 0 && (now - t.portalsShownAt > TRIVIA_PORTAL_DURATION || portalsGone)) {
          t.active = false;
          t.currentQ = null;
          g.portals = [];
          g.streak = 0;
        }
        // Check portal collision
        if (t.portalsShownAt > 0 && t.currentQ) {
          for (const portal of g.portals) {
            if (!portal.active) continue;
            const dx = playerX + PLAYER_W / 2 - portal.x,
              dy = g.playerY + PLAYER_H / 2 - portal.y;
            if (dx * dx + dy * dy < (portal.radius + 15) * (portal.radius + 15)) {
              t.answered = true;
              const correct = portal.isTrue === t.currentQ.answer;
              t.wasCorrect = correct;
              t.resultUntil = now + 1500;
              if (correct) {
                g.correctAnswers++;
                g.streak++;
                if (g.streak > g.maxStreak) g.maxStreak = g.streak;
                g.score += CORRECT_SCORE;
                if (g.lives < MAX_LIVES) g.lives++; // +1 life on correct
                g.invulnUntil = Math.max(g.invulnUntil, now + CORRECT_IMMUNITY);
                g.speedMul = CORRECT_SPEED_MUL;
                g.speedMulUntil = now + CORRECT_IMMUNITY;
                g.floats.push({
                  text: `CORRECT! +${CORRECT_SCORE}`,
                  x: w / 2,
                  y: h * 0.4,
                  color: "#3f6",
                  spawnTime: now,
                  duration: 2000,
                });
                g.flash = { color: "#fc0", startTime: now, duration: 400 };
                audio.play("sfx_coin");
              } else {
                g.streak = 0;
                g.lives--;
                g.speedMul = WRONG_SPEED_MUL;
                g.speedMulUntil = now + WRONG_DURATION;
                g.floats.push({ text: "WRONG!", x: w / 2, y: h * 0.4, color: "#f24", spawnTime: now, duration: 2000 });
                g.flash = { color: "#f00", startTime: now, duration: 400 };
                audio.play("sfx_wrong");
                if (g.lives <= 0) {
                  g.state = "gameover";
                  audio.playTrack("gameover");
                  fireGameOver();
                  return;
                }
              }
              g.portals = [];
              break;
            }
          }
        }
      }
      // Dismiss trivia result
      if (t.active && t.answered && now > t.resultUntil) {
        t.active = false;
        t.currentQ = null;
      }

      // ── Spawn obstacles ──────────────────────────────
      if (now - g.lastObsSpawn > g.nextObsDelay) {
        g.obstacles.push(spawnObs(w, h));
        g.lastObsSpawn = now;
        g.nextObsDelay = OBSTACLE_SPAWN_MIN + Math.random() * (OBSTACLE_SPAWN_MAX - OBSTACLE_SPAWN_MIN);
      }

      // ── Spawn coins ──────────────────────────────────
      if (now - g.lastCoinSpawn > COIN_SPAWN_INTERVAL) {
        g.coins.push(...spawnCoins(w, h));
        g.lastCoinSpawn = now;
      }

      // ── Update obstacles ─────────────────────────────
      const isInv = now < g.invulnUntil;
      for (let i = g.obstacles.length - 1; i >= 0; i--) {
        const o = g.obstacles[i];
        o.x -= pixelsThisFrame;
        if (o.x + o.width < -20) {
          g.obstacles.splice(i, 1);
          continue;
        }
        if (!isInv && aabb(playerX, g.playerY, PLAYER_W, PLAYER_H, o.x, o.y, o.width, o.height)) {
          g.lives--;
          g.invulnUntil = now + INVULN_DURATION;
          if (g.lives <= 0) {
            g.state = "gameover";
            audio.playTrack("gameover");
            fireGameOver();
            return;
          }
        }
      }

      // ── Update coins ─────────────────────────────────
      for (let i = g.coins.length - 1; i >= 0; i--) {
        const c = g.coins[i];
        c.x -= pixelsThisFrame;
        if (c.collected) {
          c.collectAnim -= dt * 20;
          if (c.collectAnim <= 0) g.coins.splice(i, 1);
          continue;
        }
        if (c.x < -30) {
          g.coins.splice(i, 1);
          continue;
        }
        const cx2 = Math.max(playerX, Math.min(c.x, playerX + PLAYER_W));
        const cy2 = Math.max(g.playerY, Math.min(c.y, g.playerY + PLAYER_H));
        const ddx = c.x - cx2,
          ddy = c.y - cy2;
        if (ddx * ddx + ddy * ddy < COIN_RADIUS * COIN_RADIUS) {
          c.collected = true;
          c.collectAnim = 10;
          g.score += COIN_SCORE * g.coinMul;
          g.coinMul = 2;
          g.coinMulUntil = now + COIN_DOUBLE_DURATION;
          audio.play("sfx_coin");
        }
      }

      // ── Update bots ──────────────────────────────────
      for (const bot of g.bots) {
        // Simple AI: move at varying speed with some randomness
        bot.distance += bot.speed * dt * 10 * (0.9 + Math.sin(now * 0.001 + bot.speed) * 0.2);
        bot.y += Math.sin(now * 0.002 + bot.speed * 10) * 0.5;
        bot.y = Math.max(30, Math.min(h - 70, bot.y));
      }

      // ── Draw ─────────────────────────────────────────
      drawBg(ctx, g.bgOff1, g.bgOff2);
      drawStars(ctx, g.starsL1, dt, g.scrollSpeed * 0.3);
      drawStars(ctx, g.starsL2, dt, g.scrollSpeed * 0.8);

      // Founder cage (drawn at its scrolling position)
      if (g.founderSpawned && !g.founderPassed && g.founderX > -60 && g.founderX < w + 60) {
        drawFounderCage(ctx, g.founderX, g.founderY, lvl.founder, now);
      }

      // Bots (draw in background, smaller)
      for (const bot of g.bots) {
        const botRelX = playerX + (bot.distance - g.levelDist) * 2;
        if (botRelX > -30 && botRelX < w + 30) {
          ctx.save();
          ctx.translate(botRelX, 0);
          drawBot(ctx, bot.y, bot.color, now);
          ctx.restore();
        }
      }

      for (const o of g.obstacles) drawObs(ctx, o, now);
      for (const c of g.coins) drawCoin(ctx, c, now);

      // Portals
      for (const p of g.portals) {
        if (p.active) drawPortal(ctx, p.x, p.y, p.isTrue, now);
      }

      drawPlayer(ctx, playerX, g.playerY, isInv, now, g.jetpackOn);
      drawHUD(ctx, g);

      // Trivia question text (shown before portals)
      if (t.active && t.currentQ) {
        ctx.fillStyle = "rgba(0,0,20,0.7)";
        roundRect(ctx, w * 0.1, h * 0.44, w * 0.8, 36, 8);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.fillText(t.currentQ.q, w / 2, h * 0.44 + 23, w * 0.75);
        if (t.portalsShownAt === 0) {
          const timeLeft = Math.max(0, Math.ceil((TRIVIA_QUESTION_SHOW - (now - t.questionShownAt)) / 1000));
          ctx.fillStyle = "#8899bb";
          ctx.font = "12px monospace";
          ctx.fillText(`Portals in ${timeLeft}s...`, w / 2, h * 0.44 + 50);
        }
      }

      drawFloats(ctx, g.floats, now);
      drawFlash(ctx, g.flash, now);
    };

    g.animFrameId = requestAnimationFrame(loop);
    const onResize = () => {
      resizeCanvas();
      const s = initStars(canvas.width, canvas.height);
      g.starsL1 = s.l1;
      g.starsL2 = s.l2;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(g.animFrameId);
      canvas.removeEventListener("mousedown", onMD);
      canvas.removeEventListener("mouseup", onUp);
      canvas.removeEventListener("mouseleave", onUp);
      canvas.removeEventListener("touchstart", onTS);
      canvas.removeEventListener("touchend", onTE);
      window.removeEventListener("resize", onResize);
    };
  }, [resizeCanvas, initStars, spawnObs, spawnCoins]);

  // HTML button handlers (real DOM clicks = trusted user gestures for WebAuthn/passkey)
  const handleCreateWallet = useCallback(() => {
    audioRef.current?.userStart();
    propsRef.current.onConnectWallet?.();
    // Transition to menu after Privy modal opens
    splashDismissed.current = true;
    setShowSplash(false);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.paused = false;
        audioRef.current.playTrack("intro");
      }
    }, 500);
  }, []);

  const handlePlayWithout = useCallback(() => {
    audioRef.current?.userStart();
    splashDismissed.current = true;
    setShowSplash(false);
    audioRef.current?.playTrack("intro");
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full" style={{ height: "calc(100vh - 80px)" }}>
      <canvas
        ref={canvasRef}
        className="rounded-lg cursor-pointer block"
        style={{ touchAction: "none", userSelect: "none" }}
      />
      {/* HTML overlay buttons for tap_to_enter - required for WebAuthn passkey to work */}
      {showSplash && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ pointerEvents: "auto", zIndex: 10, top: "38%" }}
        >
          <button
            onClick={handleCreateWallet}
            className="px-8 py-4 rounded-xl font-mono font-bold text-lg"
            style={{
              background: "#0a4a6a",
              color: "#00d4ff",
              border: "2px solid #00d4ff",
              minWidth: "240px",
              minHeight: "50px",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            CREATE WALLET
          </button>
          <button
            onClick={handlePlayWithout}
            className="px-4 py-2 font-mono text-sm"
            style={{
              background: "transparent",
              color: "#8899aa",
              border: "none",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            or TAP TO PLAY WITHOUT WALLET
          </button>
        </div>
      )}
    </div>
  );
};
