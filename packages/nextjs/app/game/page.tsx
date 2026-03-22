"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { GameCanvas } from "~~/components/game/GameCanvas";
import type { GameOverData } from "~~/components/game/GameCanvas";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const GamePage: NextPage = () => {
  const router = useRouter();
  const { address } = useAccount();
  const [lastGameData, setLastGameData] = useState<GameOverData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const { data: leaderboard } = useScaffoldReadContract({
    contractName: "CryptoRunnerLeaderboard",
    functionName: "getLeaderboard",
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "CryptoRunnerLeaderboard",
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
      await writeContractAsync({
        functionName: "submitScore",
        args: [BigInt(lastGameData.score), BigInt(lastGameData.correctAnswers)],
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("error");
    }
  }, [lastGameData, address, writeContractAsync]);

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
      />
    </div>
  );
};

export default GamePage;
