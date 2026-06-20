<div align="center">
  <h1>BrowserMind</h1>
  <p><strong>An autonomous web automation agent driven by ReAct and Playwright.</strong></p>
</div><hr />

## Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)

## Overview
BrowserMind is a full-stack autonomous web automation agent. By leveraging a **ReAct (Reasoning and Acting)** orchestration loop and a headless Playwright browser, BrowserMind can execute complex, multi-step tasks on the live web driven purely by natural language instructions.

### Built With
<p>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
</p>

## Key Features

- **LLM-Driven ReAct Loop**: At the core of BrowserMind is an autonomous reasoning engine. The LLM iterates in a continuous loop—thinking, invoking tools, evaluating results, and correcting its own path.
- **Set-of-Marks (SoM) Navigation**: Instead of forcing the LLM to parse raw HTML or guess CSS selectors, the backend assigns a unique integer ID to every interactive element. The agent interacts with extreme precision using the `interact_with_id` tool.
- **"Industrial Telemetry" Console**: A brutalist, high-trust Operator Console built with React. Features include a **Live Viewport Stream**, a continuous **Telemetry Tape** log of machine reasoning, and a **Vision Timeline Filmstrip**.

## Architecture
The system is built on a decoupled architecture:
- **Backend (Express/Node.js)**: Manages Playwright, the in-memory RunStore, and communication with the OpenRouter API.
- **Frontend (React/Vite)**: An interactive dashboard consuming REST endpoints and real-time SSE streams.

> **Deep Dives**: See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the visual architecture diagram and [`backend/README.md`](./backend/README.md) for the backend execution engine details.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Clone & Install
Install the packages for both the backend and frontend:
```bash
git clone https://github.com/your-username/browsermind.git
cd browsermind

# Install backend dependencies & Playwright Chromium
cd backend
npm install
npx playwright install chromium

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration
In the `backend/` directory, duplicate the `.env.example` file and rename it to `.env`:
```env
OPENROUTER_API_KEY=your_openrouter_api_key
MODEL_ID=openai/gpt-4o-mini # Recommended model
MAX_STEPS=30
PORT=3000
HEADLESS_BROWSER=false # Set to true to hide the chromium window locally
```

### 3. Run the Development Servers
You will need two terminal windows to run the stack.

**Start the Backend:**
```bash
cd backend
npm run dev
```

**Start the Frontend:**
```bash
cd frontend
npm run dev
```

## Usage

1. Navigate to the frontend at `http://localhost:5173`.
2. Toggle between Light/Dark mode in the top right.
3. In the command input, enter a natural language task. For example: *"Open scaler.com and try to login."*
4. Click **INITIALIZE RUN**.
5. Watch the **Telemetry Tape** update in real-time as the agent thinks and acts. The **Live Viewport** will automatically stream screenshots as the browser navigates the task!

## Contributing
Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/your-username/browsermind/issues).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
