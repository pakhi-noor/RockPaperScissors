from __future__ import annotations
from dataclasses import dataclass, field
from collections import defaultdict, deque
from typing import Deque, Dict, Tuple, List
import random

MOVES = ["rock", "paper", "scissors"]

def beats(move: str) -> str:
    """Return the move that beats the given move."""
    if move == "rock":
        return "paper"
    if move == "paper":
        return "scissors"
    return "rock"

@dataclass
class MarkovPredictor:
    """
    A simple Markov-style predictor:
    - Uses the last `order` user moves as a 'state'
    - Learns which move the user tends to play next from that state
    - Predicts the most likely next move and returns the counter move
    """
    order: int = 3
    history: Deque[str] = field(default_factory=lambda: deque(maxlen=50))

    # transitions[(state_tuple)][next_move] = count
    transitions: Dict[Tuple[str, ...], Dict[str, int]] = field(
        default_factory=lambda: defaultdict(lambda: defaultdict(int))
    )

    def record_user_move(self, user_move: str) -> None:
        """
        Update the model with the user's move:
        If we have enough prior history to form a state,
        increment the transition count for (state -> user_move).
        """
        if user_move not in MOVES:
            return

        # If we can form a state from the last `order` moves, learn the transition.
        if len(self.history) >= self.order:
            state = tuple(list(self.history)[-self.order:])
            self.transitions[state][user_move] += 1

        self.history.append(user_move)

    def predict_next_user_move(self) -> str:
        """
        Predict user's next move based on the last `order` moves.
        If unknown state, fallback to frequency-based or random.
        """
        if len(self.history) < self.order:
            # Not enough history yet: random guess.
            return random.choice(MOVES)

        state = tuple(list(self.history)[-self.order:])
        next_counts = self.transitions.get(state)

        if not next_counts:
            # If we haven't seen this exact state, fallback to overall frequency
            # (simple heuristic that still "learns").
            freq = {m: 0 for m in MOVES}
            for m in self.history:
                freq[m] += 1
            # Pick the most common user's move so far
            return max(freq, key=freq.get) if sum(freq.values()) else random.choice(MOVES)

        # Pick the move with the highest learned count for this state
        return max(next_counts, key=next_counts.get)

    def choose_ai_move(self) -> Tuple[str, str]:
        """
        Decide AI move:
        - Predict next user move
        - Play the counter to that predicted move
        Return (ai_move, predicted_user_move)
        """
        predicted_user = self.predict_next_user_move()
        ai_move = beats(predicted_user)
        return ai_move, predicted_user
