from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, Optional, Dict
from ml import MarkovPredictor, MOVES


Move = Literal["rock", "paper", "scissors"]

app = FastAPI(title="RPS-ML Backend")

# Allow frontend (Vite default port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "rock-paper-scissors-two-rouge.vercel.app"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# One predictor for the whole app (single-player / local demo).
# If you want multi-user, we can store one predictor per sessionId.
predictor = MarkovPredictor(order=3)

class PlayRequest(BaseModel):
    user_move: Move

class PlayResponse(BaseModel):
    user_move: Move
    ai_move: Move
    result: Literal["win", "lose", "draw"]
    predicted_next_user_move: Move
    model_info: Dict[str, int]

def outcome(user_move: str, ai_move: str) -> str:
    """Return win/lose/draw from the user's perspective."""
    if user_move == ai_move:
        return "draw"
    if (user_move == "rock" and ai_move == "scissors") or \
       (user_move == "paper" and ai_move == "rock") or \
       (user_move == "scissors" and ai_move == "paper"):
        return "win"
    return "lose"

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/play", response_model=PlayResponse)
def play(req: PlayRequest):
    user_move = req.user_move
    if user_move not in MOVES:
        raise HTTPException(status_code=400, detail="Invalid move")

    # AI chooses a move based on learned patterns
    ai_move, predicted_next = predictor.choose_ai_move()

    # Compute result for user
    result = outcome(user_move, ai_move)

    # Train/update model AFTER seeing the real user move
    predictor.record_user_move(user_move)

    # Lightweight transparency: show how much data we've learned
    learned_states = len(predictor.transitions)
    history_len = len(predictor.history)

    return PlayResponse(
        user_move=user_move,
        ai_move=ai_move,
        result=result,
        predicted_next_user_move=predicted_next,  # what AI thought you'd do next
        model_info={"history_len": history_len, "learned_states": learned_states},
    )

@app.post("/reset")
def reset():
    """Reset the model + history (useful for demos)."""
    global predictor
    predictor = MarkovPredictor(order=3)
    return {"ok": True, "message": "Model reset"}
