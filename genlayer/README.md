# GenLayer Intelligent Contract - Trivia Generator

## Overview

This Intelligent Contract uses GenLayer's AI consensus mechanism to generate crypto trivia questions for Crypto Runner. Multiple validators with different LLMs must agree on the answer, ensuring question quality through **Optimistic Democracy + Equivalence Principle**.

## Contract: `trivia_generator.py`

### Methods

| Method | Type | Description |
|--------|------|-------------|
| `generate_question(topic, difficulty)` | write | Generates a single trivia question using AI consensus |
| `generate_batch(topic, difficulty, count)` | write | Generates multiple questions at once |
| `get_questions_count()` | view | Returns total questions generated |
| `get_last_question()` | view | Returns the last generated question |

### How AI Consensus Works

1. A validator executes `gl.exec_prompt()` with the trivia prompt
2. The result (a JSON trivia question) is proposed to the network
3. Other validators independently verify the question is valid and factual
4. If consensus is reached, the question is finalized on-chain

This ensures every trivia question is verified by multiple AI models, preventing hallucinated or incorrect answers.

## Deploy to Bradbury Testnet

```bash
# Install GenLayer CLI
npm install -g genlayer

# Select Bradbury testnet
cd packages/genlayer
genlayer network
# Select: testnet (Bradbury)

# Deploy
genlayer deploy
```

## Integration with Game

The Next.js API route at `/api/genlayer-trivia` calls the Intelligent Contract:

1. Frontend requests questions from `/api/genlayer-trivia?topic=crypto&difficulty=medium`
2. API route calls GenLayer's JSON-RPC (`gen_call`) on Bradbury
3. If GenLayer responds within 3 seconds, AI-generated questions are used
4. If timeout or error, hardcoded question bank is used as fallback
5. AI-generated questions show a purple "AI GENERATED" badge in-game

## Environment Variables

```env
GENLAYER_RPC_URL=https://studio.genlayer.com:8443/api
GENLAYER_TRIVIA_CONTRACT=<deployed_contract_address>
```

## Architecture

```
Game (Canvas) ← GamePage ← API Route → GenLayer Bradbury
                                    ↓ (fallback)
                              Hardcoded Questions
```

## Bounty Eligibility

- Intelligent Contract written in Python using GenLayer SDK
- Uses `gl.exec_prompt()` for AI-powered question generation
- Deployed via GenLayer CLI to Bradbury testnet
- Full integration with game frontend via Next.js API route
- Graceful fallback ensures game never breaks
