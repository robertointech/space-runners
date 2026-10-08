"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useSwitchChain } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { getTargetNetworks } from "~~/utils/scaffold-eth";

const targetNetworks = getTargetNetworks();

const NetworkSwitcher = () => {
  const { chain } = useAccount();
  const { switchChain } = useSwitchChain();

  if (!chain || targetNetworks.length <= 1) return null;

  const other = targetNetworks.find(n => n.id !== chain.id);
  if (!other) return null;

  return (
    <button
      onClick={() => switchChain?.({ chainId: other.id })}
      className="px-2 py-1 rounded text-xs font-mono hidden sm:flex items-center gap-1"
      style={{ background: "rgba(0,212,255,0.07)", color: "#00d4ff", border: "1px solid #1a3a5a" }}
      title={`Switch to ${other.name}`}
    >
      <span style={{ color: "#8899bb" }}>⛓</span>
      {chain.name}
    </button>
  );
};

export const menuLinks = [
  { label: "Play", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
];

const PrivyConnectButton = () => {
  const { ready, authenticated, login, user, logout } = usePrivy();

  if (!ready) return null;

  if (authenticated && user) {
    const addr = user.wallet?.address;
    const display = addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "Connected";
    return (
      <button
        onClick={logout}
        className="px-3 py-1.5 rounded text-sm font-mono"
        style={{ background: "rgba(0,212,255,0.1)", color: "#00d4ff", border: "1px solid #1a3a5a" }}
      >
        {display}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className="px-3 py-1.5 rounded text-sm font-mono font-bold"
      style={{ background: "#0a4a6a", color: "#00d4ff", border: "1px solid #1a5a8a" }}
    >
      Connect Wallet
    </button>
  );
};

export const Header = () => {
  const pathname = usePathname();
  const hasPrivy = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 shrink-0"
      style={{ background: "#0a0a1e", borderBottom: "1px solid #1a1a3e" }}
    >
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <Image src="/logo.jpeg" alt="Space Runners" width={36} height={36} className="rounded" />
          <span className="font-bold text-lg hidden sm:block" style={{ color: "#00d4ff", fontFamily: "monospace" }}>
            SPACE RUNNERS
          </span>
        </Link>
        <div className="flex gap-2">
          {menuLinks.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-sm no-underline px-3 py-1 rounded"
              style={{
                color: pathname === href ? "#00d4ff" : "#8899bb",
                background: pathname === href ? "rgba(0,212,255,0.1)" : "transparent",
                fontFamily: "monospace",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <NetworkSwitcher />
        {hasPrivy ? <PrivyConnectButton /> : <RainbowKitCustomConnectButton />}
      </div>
    </div>
  );
};
