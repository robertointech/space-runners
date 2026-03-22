import { NextResponse } from "next/server";

// GenLayer Bradbury testnet config
const GENLAYER_RPC_URL = process.env.GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";
const TRIVIA_CONTRACT_ADDRESS = process.env.GENLAYER_TRIVIA_CONTRACT || "0x110cDed8791cC9aF9D7642Acb7929CBA5576F16A";

interface TriviaQuestion {
  question: string;
  options: [string, string, string];
  correct: number;
  explanation?: string;
  source: "genlayer" | "hardcoded";
}

// Fallback questions when GenLayer is unavailable
const FALLBACK_QUESTIONS: TriviaQuestion[] = [
  {
    question: "What is the max supply of Bitcoin?",
    options: ["21 million", "100 million", "Unlimited"],
    correct: 0,
    explanation: "Bitcoin has a hard cap of 21 million coins.",
    source: "hardcoded",
  },
  {
    question: "What consensus does Ethereum use?",
    options: ["Proof of Work", "Proof of Stake", "Delegated PoS"],
    correct: 1,
    explanation: "Ethereum switched to PoS with The Merge in September 2022.",
    source: "hardcoded",
  },
  {
    question: "What is a DAO?",
    options: ["Digital Asset Order", "Decentralized Autonomous Organization", "Data Access Object"],
    correct: 1,
    explanation: "DAOs are community-governed organizations on blockchain.",
    source: "hardcoded",
  },
  {
    question: "What network uses AVAX token?",
    options: ["Avalanche", "Algorand", "Arbitrum"],
    correct: 0,
    explanation: "AVAX is the native token of the Avalanche network.",
    source: "hardcoded",
  },
  {
    question: "What is a smart contract?",
    options: ["A legal agreement", "Self-executing code on blockchain", "A trading bot"],
    correct: 1,
    explanation: "Smart contracts are programs stored on a blockchain that run when conditions are met.",
    source: "hardcoded",
  },
];

async function callGenLayer(topic: string, difficulty: string): Promise<TriviaQuestion | null> {
  if (!TRIVIA_CONTRACT_ADDRESS) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3 sec timeout

  try {
    // GenLayer JSON-RPC call to read contract via gen_call
    const response = await fetch(GENLAYER_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "gen_call",
        params: [
          {
            to: TRIVIA_CONTRACT_ADDRESS,
            data: {
              function_name: "generate_question",
              function_args: [topic, difficulty],
            },
          },
          "latest",
        ],
        id: 1,
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = await response.json();
    if (data.error || !data.result) return null;

    // Parse the LLM-generated JSON from the contract result
    const resultStr = typeof data.result === "string" ? data.result : JSON.stringify(data.result);
    const parsed = JSON.parse(resultStr);

    // Validate structure
    if (
      !parsed.question ||
      !Array.isArray(parsed.options) ||
      parsed.options.length !== 3 ||
      typeof parsed.correct !== "number"
    ) {
      return null;
    }

    return {
      question: parsed.question,
      options: parsed.options as [string, string, string],
      correct: Math.max(0, Math.min(2, parsed.correct)),
      explanation: parsed.explanation || "",
      source: "genlayer",
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") || "cryptocurrency";
  const difficulty = searchParams.get("difficulty") || "medium";
  const count = Math.min(parseInt(searchParams.get("count") || "1"), 5);

  const questions: TriviaQuestion[] = [];

  // Try GenLayer first for each question
  for (let i = 0; i < count; i++) {
    const glQuestion = await callGenLayer(topic, difficulty);
    if (glQuestion) {
      questions.push(glQuestion);
    } else {
      // Fallback to hardcoded
      const fallback = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
      questions.push({ ...fallback });
    }
  }

  return NextResponse.json({
    questions,
    genLayerAvailable: questions.some(q => q.source === "genlayer"),
    contractAddress: TRIVIA_CONTRACT_ADDRESS || "not configured",
  });
}
