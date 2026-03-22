# GenLayer Intelligent Contract - Trivia Generator

## Overview

This Intelligent Contract uses GenLayer's AI consensus mechanism to generate crypto trivia questions for Space Runners. Multiple validators with different LLMs must agree on the answer, ensuring question quality through **Optimistic Democracy + Equivalence Principle**.

## Contract: `trivia_generator.py`

### Methods

| Method | Type | Description |
|--------|------|-------------|
| `generate_question(topic, difficulty)` | write | Generates a single trivia question using AI consensus |
| `generate_batch(topic, difficulty, count)` | write | Generates multiple questions at once |
| `get_questions_count()` | view | Returns total questions generated |
| `get_last_question()` | view | Returns the last generated question |

### How AI Consensus Works (Optimistic Democracy)

1. A validator executes `gl.exec_prompt()` with the trivia prompt
2. The result (a JSON trivia question) is proposed to the network
3. Other validators independently verify the question is valid and factual
4. If consensus is reached via **Optimistic Democracy**, the question is finalized on-chain
5. The **Equivalence Principle** ensures multiple LLMs (GPT-4, Claude, Llama, etc.) agree on the correctness of the answer - preventing single-model hallucinations

This ensures every trivia question is verified by multiple AI models, preventing hallucinated or incorrect answers.

## Bradbury Testnet Deployment

### Network Configuration
- **Network:** Genlayer Bradbury Testnet
- **Chain ID:** 4221
- **RPC:** `https://rpc-bradbury.genlayer.com`
- **Explorer:** `https://explorer-bradbury.genlayer.com/`
- **Faucet:** `https://testnet-faucet.genlayer.foundation/`
- **Account:** `0x355cfb617e0df7dd1b49949ee6a5d1732152da99`

### Deploy Steps

```bash
# Install GenLayer CLI
npx genlayer --version

# Create and unlock account
npx genlayer account create --name spacerunners --password <password>
npx genlayer account unlock --password <password>

# Set network to Bradbury
npx genlayer network set testnet-bradbury

# Get testnet GEN tokens from faucet
# Visit: https://testnet-faucet.genlayer.foundation/
# Enter: 0x355cfb617e0df7dd1b49949ee6a5d1732152da99

# Deploy
npx genlayer deploy --contract genlayer/contracts/trivia_generator.py
```

### Current Status

**Account created and configured on Bradbury testnet.** Deploy attempted but requires GEN tokens from faucet (web-only, 100 GEN per claim, once per 24h).

Deploy error received:
```
sender does not have enough funds (0) to cover transaction fees: 427297024056600
```

**To complete deployment:**
1. Visit https://testnet-faucet.genlayer.foundation/
2. Enter address: `0x355cfb617e0df7dd1b49949ee6a5d1732152da99`
3. Claim 100 GEN
4. Run: `npx genlayer deploy --contract genlayer/contracts/trivia_generator.py`
5. Update `GENLAYER_TRIVIA_CONTRACT` env var with deployed address

## Integration with Game

The Next.js API route at `/api/genlayer-trivia` calls the Intelligent Contract:

1. Frontend requests questions from `/api/genlayer-trivia?topic=crypto&difficulty=medium`
2. API route calls GenLayer's JSON-RPC on Bradbury
3. If GenLayer responds within 3 seconds, AI-generated questions are used
4. If timeout or error, hardcoded question bank is used as fallback
5. Game **never breaks** if GenLayer is down

## Architecture

```
Game (Canvas) <- GamePage <- API Route -> GenLayer Bradbury (RPC: rpc-bradbury.genlayer.com)
                                      |-> (fallback) Hardcoded Questions
```

## Bounty Eligibility

- Intelligent Contract written in Python using GenLayer SDK (`@gl.contract`, `gl.exec_prompt`)
- Uses **Optimistic Democracy** consensus for AI question validation
- Uses **Equivalence Principle** - multiple LLMs must agree on answer correctness
- Configured for Bradbury Testnet (chain 4221)
- Account created, deploy attempted, pending faucet funding
- Full integration with game frontend via Next.js API route
- Graceful fallback ensures game never breaks
