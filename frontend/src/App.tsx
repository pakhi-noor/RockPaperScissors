import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";
import snoopyGif from "./assets/snoopy.gif";
import loseGif from "./assets/lose.gif";
import drawGif from "./assets/draw.gif";


type Move = "rock" | "paper" | "scissors";
type Result = "win" | "lose" | "draw";

type PlayResponse = {
  user_move: Move;
  ai_move: Move;
  result: Result;
  predicted_next_user_move: Move;
  model_info: {
    history_len: number;
    learned_states: number;
  };
};

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const MOVE_EMOJI: Record<Move, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const RESULT_TEXT: Record<Result, string> = {
  win: "You win!",
  lose: "You lose!",
  draw: "Draw!",
};

export default function App() {
  // -----------------------------
  // Core game state
  // -----------------------------
  const [userMove, setUserMove] = useState<Move | null>(null);
  const [aiMove, setAiMove] = useState<Move | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // ML transparency state
  const [predictedNext, setPredictedNext] = useState<Move | null>(null);
  const [modelInfo, setModelInfo] = useState<PlayResponse["model_info"] | null>(
    null
  );

  // Forces move animations to refresh every round (even if same move repeats)
  const [revealRound, setRevealRound] = useState(0);


  // UI state
  const [loading, setLoading] = useState(false);

  // Local score tracking
  const [score, setScore] = useState<Record<Result, number>>({
    win: 0,
    lose: 0,
    draw: 0,
  });

  // -----------------------------
  // Countdown (every turn) + early pick
  // -----------------------------
  // countdown: 3,2,1 => ROCK/PAPER/SCISSORS, then SHOO!
  const [countdown, setCountdown] = useState<3 | 2 | 1 | null>(3);
  const [showShoo, setShowShoo] = useState(false);

  // When true, we can immediately submit to backend. When false, we only queue.
  const [canChoose, setCanChoose] = useState(false);

  // User can pre-pick during countdown; we'll auto-submit on SHOO end
  const [queuedMove, setQueuedMove] = useState<Move | null>(null);
  const queuedMoveRef = useRef<Move | null>(null);

  // Prevent accidental double submit
  const isSubmittingRef = useRef(false);

  // Reaction GIF handling
  const [showReaction, setShowReaction] = useState(false);
  const reactionTimerRef = useRef<number | null>(null);


  // Keep queuedMoveRef synced with state
  useEffect(() => {
    queuedMoveRef.current = queuedMove;
  }, [queuedMove]);

  function triggerReaction() {
    // reset timer if user plays quickly
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);

    setShowReaction(true);

    // auto-hide after 1.4s
    reactionTimerRef.current = window.setTimeout(() => {
      setShowReaction(false);
    }, 1400);
  }

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    };
  }, []);



  /**
   * Start the "ROCK → PAPER → SCISSORS → SHOO!" countdown.
   * - allows pre-picking (buttons stay clickable)
   * - but does not submit until SHOO ends
   */
  function startCountdown() {
    setCanChoose(false);
    setShowShoo(false);
    setCountdown(3);

    // Clear selection for upcoming round
    setQueuedMove(null);
    queuedMoveRef.current = null;
  }


  // Start countdown on first render
  useEffect(() => {
    startCountdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Drive countdown timer
  useEffect(() => {
    if (countdown === null) return;

    const t = setTimeout(() => {
      setCountdown((prev) => {
        if (prev === null) return null;

        if (prev === 1) {
          // End of 3..2..1 => show SHOO briefly
          setShowShoo(true);

          // After SHOO, we allow choosing/submitting
          setTimeout(() => {
            setShowShoo(false);
            setCanChoose(true);

            //If user already pre-picked during countdown, auto-submit now
            const q = queuedMoveRef.current;
            if (q) submitMove(q);
          }, 650);

          return null;
        }

        return (prev - 1) as 3 | 2 | 1;
      });
    }, 1000);

    return () => clearTimeout(t);
    // queuedMove isn't needed here because we read from queuedMoveRef
  }, [countdown]);

  /**
   * Submit the move to backend (the actual "play" call).
   * This is called either:
   * - immediately (if canChoose is true), or
   * - automatically after SHOO (if user queued a move)
   */
  async function submitMove(move: Move) {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setLoading(true);
    setUserMove(move);

    try {
      const res = await fetch(`${API}/play`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_move: move }),
      });

      const data: PlayResponse = await res.json();
      if (!res.ok) throw new Error((data as any)?.detail ?? "Request failed");

      // Show results
      setAiMove(data.ai_move);
      setResult(data.result);
      setPredictedNext(data.predicted_next_user_move);
      setModelInfo(data.model_info);

      triggerReaction();

      //force new animation cycle even if move repeats
      setRevealRound((r) => r + 1);

      // Update score (TypeScript-safe because result is a union type)
      setScore((s) => ({ ...s, [data.result]: s[data.result] + 1 }));

      // Next round starts with countdown again
      startCountdown();
    } catch (e) {
      console.error(e);
      alert("Backend not reachable. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }

  /**
   * Called when user clicks Rock/Paper/Scissors.
   * - During countdown: queue it (so player can choose early)
   * - After SHOO (canChoose=true): submit immediately
   */
  function chooseMove(move: Move) {
    if (loading) return;

    if (!canChoose) {
      // Queue the choice (and show it on the UI immediately)
      setQueuedMove(move);
      queuedMoveRef.current = move;
      setUserMove(move);
      return;
    }

    // Countdown finished -> submit immediately
    submitMove(move);
  }

  /**
   * Reset backend model + UI.
   */
  async function resetModel() {
    setLoading(true);
    try {
      await fetch(`${API}/reset`, { method: "POST" });

      setUserMove(null);
      setAiMove(null);
      setResult(null);
      setPredictedNext(null);
      setModelInfo(null);
      setScore({ win: 0, lose: 0, draw: 0 });

      startCountdown();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <header className="header">
          <div>
            <h1 className="title">Rock Paper Scissors — Think Twice🫡</h1>
          </div>
          <div className="scoreBox">
            <div className="scoreRow">Win ✅ {score.win}</div>
            <div className="scoreRow">Lose ❌ {score.lose}</div>
            <div className="scoreRow">Draw ➖ {score.draw}</div>
          </div>
        </header>

        {/* Countdown centered */}
        <AnimatePresence>
          {(showShoo || countdown !== null) && (
            <motion.div
              className="countdownCenter"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                key={showShoo ? "shoo" : `count-${countdown}`}
                className="countdownText"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                {showShoo
                  ? "SHOO!"
                  : countdown === 3
                    ? "ROCK"
                    : countdown === 2
                      ? "PAPER"
                      : "SCISSORS"}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Description BELOW countdown */}
        <p className="subtitle centered">
          Pick anytime during the countdown — your move auto-plays on SHOO!
        </p>

        <div className="arena">
          <div className="card">
            <div className="cardTitle">You</div>
            <MoveDisplay move={userMove} roundKey={revealRound} />
          </div>

          <div className="vs">VS</div>

          <div className="card">
            <div className="cardTitle">AI</div>
            <MoveDisplay move={aiMove} roundKey={revealRound} />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              className="resultCard"
              key={`result-${result}-${revealRound}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              <div className="resultLeft">
                <div className="resultTitle">{RESULT_TEXT[result]}</div>

                {predictedNext && (
                  <div className="predLine">
                    AI predicted your next move: <b>{predictedNext.toUpperCase()}</b>
                  </div>
                )}

                {modelInfo && (
                  <div className="meta">
                    Learned states: <b>{modelInfo.learned_states}</b> • Moves seen:{" "}
                    <b>{modelInfo.history_len}</b>
                  </div>
                )}
              </div>

              <motion.img
                key={`gif-${result}-${revealRound}`}
                src={result === "win" ? snoopyGif : result === "lose" ? loseGif : drawGif}
                alt={`${result} reaction`}
                className="resultGif"
                initial={{ opacity: 0, x: 10, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>
          )}
        </AnimatePresence>



        <div className="controls">
          {(["rock", "paper", "scissors"] as Move[]).map((m) => (
            <motion.button
              key={m}
              className={`moveBtn ${queuedMove === m ? "selected" : ""} ${loading ? "disabled" : ""
                }`}
              whileHover={!loading ? { scale: 1.03 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              onClick={() => chooseMove(m)}
              disabled={loading}
              title={
                canChoose
                  ? "Play now"
                  : "Pick now (will auto-play on SHOO!)"
              }
            >
              <span className="emoji">{MOVE_EMOJI[m]}</span>
              <span className="moveText">{m.toUpperCase()}</span>
            </motion.button>
          ))}

          <button className="resetBtn" onClick={resetModel} disabled={loading}>
            Reset AI
          </button>
        </div>

        <div className="tip">
          Tip: Be predictable and the AI will counter you. Break the pattern to win.😋
        </div>
      </div>
    </div>
  );
}

/** Animated move display */
function MoveDisplay({ move, roundKey }: { move: Move | null; roundKey: number }) {
  return (
    <div className="moveBox">
      <AnimatePresence mode="wait">
        {move ? (
          <motion.div
            className="move"
            //key includes roundKey so it re-animates every round
            key={`${move}-${roundKey}`}
            initial={{ opacity: 0, y: 12, rotate: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="moveEmoji">{MOVE_EMOJI[move]}</div>
            <div className="moveLabel">{move.toUpperCase()}</div>
          </motion.div>
        ) : (
          <motion.div
            className="placeholder"
            key={`empty-${roundKey}`}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
          >
            —
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}