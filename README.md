# ROCK PAPER SCISSOR - THINK TWICE 🎮  

Live Demo:
👉 https://rock-paper-scissors-schararas-projects.vercel.app/

Author: Scharara Islam

## Overview
An interactive Rock-Paper-Scissors game where the AI learns your behavior over time and adapts its strategy using a lightweight machine-learning model.
This project demonstrates **full-stack development**, **ML concepts**, and **production deployment** using modern tools.

---

## Features ✨
- 🎮 Classic Rock–Paper–Scissors gameplay
- 🧠 Adaptive AI using a Markov-chain–based predictor
- ⏱️ Countdown system (Rock → Paper → Scissors → SHOOT!)
- 🔮 AI transparency:
    - Shows what move the AI predicted you would play next
    - Displays how much the model has learned
- 📊 Win / Lose / Draw tracking
- 🎞️ Animated UI with smooth transitions
- 🌐 Fully deployed frontend + backend

---

## 🧠 How the AI Works
The AI tracks sequences of your previous moves
It learns patterns (e.g., rock → paper → scissors)
Based on learned transitions, it predicts your next move
The AI then chooses the counter move
The more you play, the smarter it gets
This keeps the game fair, fast, and explainable; no heavy ML libraries required.

---

## Tech Stack

### Backend
- Python
- FastAPI
- Custom Markov Chain predictor
- Deployed on Render

### Frontend
- React + TypeScript
- Vite
- Framer Motion (animations)
- Deployed on Vercel

---

## Project Structure
```bash
RockPaperScissors/
├── backend/
│   ├── app.py              # FastAPI application & routes
│   ├── ml.py               # Markov-chain based AI predictor
│   ├── requirements.txt    # Python dependencies
│   └── .venv/              # Python virtual environment (local)
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   │   ├── win.gif
│   │   │   ├── lose.gif
│   │   │   ├── draw.gif
│   │   │   └── snoopy.gif
│   │   ├── App.tsx         # Main React application
│   │   ├── App.css         # Styles
│   │   ├── main.tsx        # React entry point
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---
