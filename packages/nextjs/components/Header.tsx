"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

export const menuLinks = [
  { label: "Play", href: "/" },
  { label: "Leaderboard", href: "/leaderboard" },
];

export const Header = () => {
  const pathname = usePathname();

  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between px-4 py-2 shrink-0"
      style={{ background: "#0a0a1e", borderBottom: "1px solid #1a1a3e" }}
    >
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg no-underline" style={{ color: "#00d4ff", fontFamily: "monospace" }}>
          SPACE RUNNERS
        </Link>
        <div className="flex gap-3">
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
      <RainbowKitCustomConnectButton />
    </div>
  );
};
