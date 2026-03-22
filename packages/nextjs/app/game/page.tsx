"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import type { GameOverData } from "~~/components/game/GameCanvas";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const GameCanvas = dynamic(() => import("~~/components/game/GameCanvas").then(m => ({ default: m.GameCanvas })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full" style={{ height: "calc(100vh - 80px)" }}>
      <div style={{ color: "#00d4ff", fontFamily: "monospace", fontSize: 24 }}>Loading...</div>
    </div>
  ),
});

const GamePage: NextPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [lastGameData, setLastGameData] = useState<GameOverData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: leaderboard } = useScaffoldReadContract({
    contractName: "CryptoRunnerLeaderboard",
    functionName: "getLeaderboard",
  });

  const { writeContractAsync: writeLeaderboard } = useScaffoldWriteContract({
    contractName: "CryptoRunnerLeaderboard",
  });

  const { writeContractAsync: writeAgents } = useScaffoldWriteContract({
    contractName: "SpaceRunnerAgents",
  });

  const leaderboardScores: number[] = leaderboard
    ? (leaderboard as readonly { player: string; score: bigint; correctAnswers: bigint; timestamp: bigint }[])
        .map(entry => Number(entry.score))
        .sort((a, b) => b - a)
    : [];

  const handleGameOver = useCallback((data: GameOverData) => {
    setLastGameData(data);
    setSaveStatus("idle");
  }, []);

  const handleSaveScore = useCallback(async () => {
    if (!lastGameData || !address) return;
    setSaveStatus("saving");
    try {
      // Save player score to leaderboard
      await writeLeaderboard({
        functionName: "submitScore",
        args: [BigInt(lastGameData.score), BigInt(lastGameData.correctAnswers)],
      });

      // Update bot agent stats (ERC-8004 agents react to game state)
      try {
        await writeAgents({
          functionName: "updateRaceResults",
          args: [
            [
              BigInt(lastGameData.botScores[0]),
              BigInt(lastGameData.botScores[1]),
              BigInt(lastGameData.botScores[2]),
              BigInt(lastGameData.botScores[3]),
            ] as const,
            [
              BigInt(lastGameData.botDistances[0]),
              BigInt(lastGameData.botDistances[1]),
              BigInt(lastGameData.botDistances[2]),
              BigInt(lastGameData.botDistances[3]),
            ] as const,
            BigInt(lastGameData.score),
          ],
        });
      } catch {
        // Bot stats update is non-critical, don't fail the save
        console.warn("Failed to update bot agent stats");
      }

      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [lastGameData, address, writeLeaderboard, writeAgents]);

  const handleViewLeaderboard = useCallback(() => {
    router.push("/leaderboard");
  }, [router]);

  return (
    <div className="w-full h-full">
      <GameCanvas
        walletAddress={address}
        onGameOver={handleGameOver}
        leaderboardScores={leaderboardScores}
        saveStatus={saveStatus}
        onSaveScore={handleSaveScore}
        onViewLeaderboard={handleViewLeaderboard}
        onConnectWallet={openConnectModal}
      />
    </div>
  );
};

export default GamePage;
