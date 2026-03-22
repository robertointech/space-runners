"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const truncateAddress = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

const LeaderboardPage: NextPage = () => {
  const { address } = useAccount();
  const [timedOut, setTimedOut] = useState(false);
  const winnerRef = useRef<HTMLAudioElement | null>(null);

  // Play winner.mp3 on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const a = new Audio("/audio/winner.mp3");
      a.volume = 0.4;
      a.play().catch(() => {});
      winnerRef.current = a;
    } catch {}
    return () => {
      if (winnerRef.current) {
        try {
          winnerRef.current.pause();
        } catch {}
      }
    };
  }, []);

  // 5 second timeout for loading
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const { data: leaderboard, isLoading } = useScaffoldReadContract({
    contractName: "CryptoRunnerLeaderboard",
    functionName: "getLeaderboard",
  });

  const { data: totalPlayers } = useScaffoldReadContract({
    contractName: "CryptoRunnerLeaderboard",
    functionName: "totalPlayers",
  });

  const { data: myStats } = useScaffoldReadContract({
    contractName: "CryptoRunnerLeaderboard",
    functionName: "getPlayerStats",
    args: [address],
  });

  const entries = leaderboard
    ? (leaderboard as readonly { player: string; score: bigint; correctAnswers: bigint; timestamp: bigint }[])
        .map(e => ({
          player: e.player,
          score: Number(e.score),
          correctAnswers: Number(e.correctAnswers),
          timestamp: Number(e.timestamp),
        }))
        .sort((a, b) => b.score - a.score)
    : [];

  const showLoading = isLoading && !timedOut;

  return (
    <div className="flex flex-col items-center px-4 py-8 min-h-screen">
      <h1 className="text-4xl font-bold mb-2 font-mono" style={{ color: "#00d4ff" }}>
        LEADERBOARD
      </h1>
      <p className="text-sm opacity-60 mb-6 font-mono">
        {totalPlayers ? `${Number(totalPlayers)} players` : timedOut ? "" : "Loading..."}
      </p>

      {address && myStats && Number((myStats as { gamesPlayed: bigint }).gamesPlayed) > 0 && (
        <div className="mb-6 p-4 rounded-lg w-full max-w-2xl" style={{ background: "#111133" }}>
          <div className="font-mono text-sm opacity-70 mb-1">YOUR STATS</div>
          <div className="flex gap-6 font-mono text-sm">
            <span>
              Best:{" "}
              <strong className="text-lg" style={{ color: "#ffcc00" }}>
                {Number((myStats as { bestScore: bigint }).bestScore)}
              </strong>
            </span>
            <span>
              Games: <strong>{Number((myStats as { gamesPlayed: bigint }).gamesPlayed)}</strong>
            </span>
            <span>
              Correct: <strong>{Number((myStats as { totalCorrectAnswers: bigint }).totalCorrectAnswers)}</strong>
            </span>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl">
        {showLoading ? (
          <div className="text-center py-8 font-mono opacity-60">Loading scores...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 font-mono">
            <p className="opacity-60 mb-4">No scores yet. Play to be the first!</p>
            <Link
              href="/"
              className="px-6 py-2 rounded-lg font-bold no-underline"
              style={{ background: "#0a4a6a", color: "#00d4ff" }}
            >
              PLAY NOW
            </Link>
          </div>
        ) : (
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="border-b border-gray-700" style={{ color: "#8888aa" }}>
                <th className="py-3 text-left w-12">Rank</th>
                <th className="py-3 text-left">Player</th>
                <th className="py-3 text-right">Score</th>
                <th className="py-3 text-right">Trivia</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const isMe = address && entry.player.toLowerCase() === address.toLowerCase();
                return (
                  <tr
                    key={i}
                    className="border-b border-gray-800"
                    style={{ background: isMe ? "rgba(0, 212, 255, 0.08)" : "transparent" }}
                  >
                    <td className="py-3 font-bold" style={{ color: i < 3 ? "#ffcc00" : "#aaaacc" }}>
                      #{i + 1}
                    </td>
                    <td className="py-3">
                      <span style={{ color: isMe ? "#00d4ff" : "#ccccdd" }}>{truncateAddress(entry.player)}</span>
                      {isMe && (
                        <span
                          className="ml-2 text-xs px-1 rounded"
                          style={{ background: "#00d4ff22", color: "#00d4ff" }}
                        >
                          YOU
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-bold" style={{ color: "#ffcc00" }}>
                      {entry.score}
                    </td>
                    <td className="py-3 text-right" style={{ color: "#88aacc" }}>
                      {entry.correctAnswers}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Link
        href="/"
        className="mt-8 px-8 py-3 rounded-lg font-mono font-bold text-lg no-underline"
        style={{ background: "#0a4a2a", color: "#33ff66" }}
      >
        PLAY AGAIN
      </Link>
    </div>
  );
};

export default LeaderboardPage;
