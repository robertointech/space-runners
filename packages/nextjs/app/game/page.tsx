"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
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
  const { address: wagmiAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { login, user, authenticated } = usePrivy();
  const [lastGameData, setLastGameData] = useState<GameOverData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Use Privy wallet if available, otherwise wagmi
  const privyAddress = authenticated && user?.wallet?.address ? user.wallet.address : undefined;
  const address = (privyAddress || wagmiAddress) as `0x${string}` | undefined;

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
      await writeLeaderboard({
        functionName: "submitScore",
        args: [BigInt(lastGameData.score), BigInt(lastGameData.correctAnswers)],
      });
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

  // Use Privy login if available, RainbowKit as fallback
  const handleConnectWallet = useCallback(() => {
    if (process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      login();
    } else {
      openConnectModal?.();
    }
  }, [login, openConnectModal]);

  return (
    <div className="w-full h-full">
      <GameCanvas
        walletAddress={address}
        onGameOver={handleGameOver}
        leaderboardScores={leaderboardScores}
        saveStatus={saveStatus}
        onSaveScore={handleSaveScore}
        onViewLeaderboard={handleViewLeaderboard}
        onConnectWallet={handleConnectWallet}
      />
    </div>
  );
};

export default GamePage;
