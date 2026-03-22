import "@rainbow-me/rainbowkit/styles.css";
import "@scaffold-ui/components/styles.css";
import type { Metadata } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

export const metadata: Metadata = {
  title: "Space Runners",
  description:
    "Endless runner with crypto trivia, onchain leaderboard on Avalanche, and AI-powered questions via GenLayer",
  icons: { icon: "/logo.jpeg" },
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className="">
      <body>
        <ThemeProvider enableSystem>
          <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
