import json
from genlayer import *


@gl.contract
class TriviaGenerator:
    questions_generated: int
    last_question: str

    def __init__(self):
        self.questions_generated = 0
        self.last_question = ""

    @gl.public.write
    def generate_question(self, topic: str, difficulty: str) -> str:
        """
        Generates a crypto trivia question using AI consensus.
        Multiple validators with different LLMs must agree on the answer
        via GenLayer's Optimistic Democracy + Equivalence Principle.
        """
        prompt = f"""Generate a multiple choice trivia question about {topic} in the cryptocurrency and blockchain space.
Difficulty: {difficulty}

Rules:
- Question must be factual and verifiable
- Exactly 3 options (A, B, C)
- Only one correct answer
- Options should be plausible but clearly distinguishable

Format your response as JSON only:
{{"question": "...", "options": ["A", "B", "C"], "correct": 0, "explanation": "..."}}

The "correct" field is the index (0, 1, or 2) of the correct answer.
Only respond with valid JSON, nothing else."""

        result = gl.exec_prompt(prompt)
        self.questions_generated += 1
        self.last_question = result
        return result

    @gl.public.write
    def generate_batch(self, topic: str, difficulty: str, count: int) -> str:
        """
        Generates multiple questions at once for better efficiency.
        Returns a JSON array of question objects.
        """
        prompt = f"""Generate {count} multiple choice trivia questions about {topic} in cryptocurrency and blockchain.
Difficulty: {difficulty}

Rules:
- Each question must be factual and verifiable
- Exactly 3 options per question
- Only one correct answer per question
- All questions must be different
- Cover diverse subtopics within {topic}

Format as a JSON array:
[{{"question": "...", "options": ["A", "B", "C"], "correct": 0, "explanation": "..."}}, ...]

Only respond with valid JSON array, nothing else."""

        result = gl.exec_prompt(prompt)
        self.questions_generated += count
        return result

    @gl.public.view
    def get_questions_count(self) -> int:
        return self.questions_generated

    @gl.public.view
    def get_last_question(self) -> str:
        return self.last_question
