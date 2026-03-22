# CRYPTO RUNNER

**Endless runner with crypto trivia, onchain leaderboard, and AI-powered questions.**

Built for the **Aleph Hackathon (March 2026)** - targeting Avalanche + GenLayer bounties.

## How to Play

1. **Connect wallet** (top-right) to save scores onchain
2. **Tap/Click** to start - hold to fly with jetpack, release to fall
3. **Collect coins** (golden BTC tokens) for points
4. **Avoid enemies** - bankeros (suit guys) and aliens (green)
5. **Answer trivia** every 15 seconds - correct = immunity + speed boost
6. **Survive** as long as you can - 5 lives, increasing difficulty
7. **Save your score** onchain after game over
8. **Check the leaderboard** to see top players

## Gameplay Features

- **Jetpack physics** - tap to fly, gravity pulls you down
- **Crypto trivia** - 30 questions, 6-second timer, streak bonuses (3x = 2x coins)
- **AI-generated questions** via GenLayer Intelligent Contracts (with hardcoded fallback)
- **5 lives** with invulnerability frames on hit
- **Increasing difficulty** - speed ramps up over time
- **Pixel art graphics** - retro sci-fi space station aesthetic, all canvas-drawn

## Architecture

```
+-------------------+     +----------------------+     +-------------------+
|   Next.js App     |     |  Avalanche Fuji      |     |  GenLayer Bradbury|
|   (Vercel)        |---->|  CryptoRunnerBoard    |     |  TriviaGenerator  |
|                   |     |  (Leaderboard)        |     |  (AI Questions)   |
|  /game            |     +----------------------+     +-------------------+
|  /leaderboard     |            ^                           ^
|  /api/genlayer-   |------------|---------------------------|
|       trivia      |    submitScore()              gen_call()
+-------------------+    getLeaderboard()        (3s timeout + fallback)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React, HTML5 Canvas, Tailwind CSS |
| Wallet | RainbowKit + wagmi (Scaffold-ETH 2) |
| Smart Contract | Solidity 0.8.30 (Hardhat) |
| Blockchain | Avalanche Fuji Testnet (C-Chain, chainId 43113) |
| AI Trivia | GenLayer Intelligent Contract (Python, Bradbury Testnet) |
| Framework | Scaffold-ETH 2 |
| Deploy | Vercel (frontend), Hardhat (contracts) |

## Contract Addresses (Avalanche Fuji)

| Contract | Address |
|----------|---------|
| YourContract | [`0xDbF22B27667FF1eb1a33A9bDC085351751EEB2f8`](https://testnet.snowtrace.io/address/0xDbF22B27667FF1eb1a33A9bDC085351751EEB2f8) |
| CryptoRunnerLeaderboard | [`0x11E3366e838d84eb642a41d8B0976584d8829240`](https://testnet.snowtrace.io/address/0x11E3366e838d84eb642a41d8B0976584d8829240) |
| SpaceRunnerAgents | [`0x16fa0AB1Cb6Cffa62507f164015E0A621a2e62Bb`](https://testnet.snowtrace.io/address/0x16fa0AB1Cb6Cffa62507f164015E0A621a2e62Bb) |

## ERC-8004 Autonomous Agents (Avalanche Track)

The 4 NPC bot racers (CryptoKid, HODLer, DeFiDegen, MoonBoy) are **onchain autonomous agents** inspired by the ERC-8004 standard:

- **Onchain Identity:** Each bot has a unique ID, name, and wallet address registered on Avalanche Fuji
- **Asset Ownership:** Agents own their stats (races, wins, best scores) as onchain data
- **Game State Reaction:** After each race, `updateRaceResults()` records how each bot performed - their stats update based on actual game outcomes
- **Service Endpoints:** Agents expose a service URI for querying their data
- **Cross-chain Ready:** Contract follows ERC-8004 identity patterns (agent registry type, service endpoints)

```solidity
// SpaceRunnerAgents.sol
struct Agent {
    uint256 id;
    string name;
    address wallet;     // Agent's own wallet (can hold assets)
    uint256 totalRaces;
    uint256 wins;
    uint256 bestScore;
    uint256 totalDistance;
}
```

When a player saves their score, the game also calls `updateRaceResults()` with each bot's performance data - making the NPCs "alive" onchain.

## GenLayer Integration

The `TriviaGenerator` Intelligent Contract uses GenLayer's AI consensus to generate trivia questions. Multiple validators with different LLMs agree on each answer via Optimistic Democracy.

- **Contract:** `genlayer/contracts/trivia_generator.py`
- **Deployed on Bradbury:** [`0x110cDed8791cC9aF9D7642Acb7929CBA5576F16A`](https://explorer-bradbury.genlayer.com/)
- **TX:** `0x2d6f582e8656f384310d8b32165d976dc566f01d6fafd35f9f231c9756ade27b`
- **Consensus:** 5 validators voted AGREE (Optimistic Democracy + Equivalence Principle)
- API route: `/api/genlayer-trivia` (3-second timeout, falls back to hardcoded questions)

## Quick Start

```bash
# Install dependencies
yarn install

# For local dev: change targetNetworks in scaffold.config.ts to [chains.hardhat]
# Start local chain + deploy contracts
yarn chain          # Terminal 1
yarn deploy         # Terminal 2

# Start frontend
yarn start          # Terminal 3

# Open http://localhost:3000/game
```

## Deploy to Avalanche Fuji

```bash
# Generate deployer account
yarn generate

# Fund with Fuji AVAX from faucet: https://faucet.avax.network/

# Deploy contracts
yarn deploy --network avalancheFuji
```

## Deploy Frontend to Vercel

```bash
# Login to Vercel
yarn vercel:login

# Deploy
yarn vercel --prod
```

## Bounties

- **Avalanche** - Game runs on Avalanche Fuji, leaderboard contract, wallet integration
- **GenLayer** - Intelligent Contract for AI-powered trivia with consensus verification

## Project Structure

```
crypto-runner/
  packages/
    hardhat/
      contracts/
        CryptoRunnerLeaderboard.sol    # Onchain leaderboard (top 10, player stats)
      deploy/
        01_deploy_leaderboard.ts       # Deploy script
    nextjs/
      app/
        game/page.tsx                  # Game page (wallet + contract hooks)
        leaderboard/page.tsx           # Leaderboard page
        api/genlayer-trivia/route.ts   # GenLayer API bridge
      components/game/
        GameCanvas.tsx                 # Full game engine (~1400 lines)
  genlayer/
    contracts/
      trivia_generator.py             # GenLayer Intelligent Contract
    deploy/
      deployScript.ts                 # Bradbury deployment script
```

## Credits

Built in 12 hours at the Aleph Hackathon, March 2026.
