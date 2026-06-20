# BrowserMind Frontend: Operator Console

This directory contains the React + Vite frontend for BrowserMind. It serves as the primary interface for users to dispatch tasks to the autonomous agent and monitor its real-time execution.

## Design Philosophy: Industrial Telemetry

Rather than relying on consumer-grade "AI Chatbot" aesthetics (like soft gradients, floating chat bubbles, and glassmorphism), this frontend is intentionally designed as an **Operator Console**. 

The UI takes inspiration from diagnostic readouts, server logs, and industrial telemetry. 
Key design choices include:
- **Strict Grid Layouts**: 1px solid black borders delineate every section.
- **Monospace Dominance**: `IBM Plex Mono` is used for all machine outputs, tool arguments, and timestamps to emphasize legibility and raw data representation.
- **High Contrast**: A stark palette (Machine Gray, Stark White, Pure Near-Black, and Blueprint Blue) to ensure the interface feels like a high-trust diagnostic tool.
- **Dark Mode**: A first-class dark mode that inverts the palette to ultra-dark gray (`#18181b`) while maintaining the brutalist aesthetic.

## Core Components

The UI is divided into two primary layout columns, followed by a historical gallery:

### 1. `TaskInput.tsx` (CMD / Control)
A terminal-like input form where the user enters the natural language task to kick off the agent. It eschews complex dropdowns in favor of a raw command prompt.

### 2. `RunStatus.tsx`
A high-contrast status banner that displays the current `SYS_STATE` (IDLE, RUNNING, COMPLETED, ERROR) and any final output messages from the LLM.

### 3. `StepLog.tsx` (The Telemetry Tape)
A continuous, append-only vertical timeline representing the ReAct loop. It streams Server-Sent Events (SSE) from the backend, displaying exact millisecond timestamps, the agent's internal `[THINK]` reasoning, and the exact `[ACTION]` JSON payloads dispatched to the browser.

### 4. `ScreenshotGallery.tsx` (Vision Filmstrip)
A horizontal, grayscale filmstrip gallery at the bottom of the layout. It captures and stores the exact browser viewport state alongside the corresponding tool execution, allowing the operator to audit the agent's visual history.

## API Integration (`api.ts`)

The frontend remains entirely decoupled from Playwright or LLM logic. It communicates with the backend via two main paths:
1. **REST POST (`/api/runs`)**: Initiates a new run with the user's task.
2. **Server-Sent Events (`/api/runs/:id/events`)**: Subscribes to a live event stream. This ensures the frontend remains highly performant and non-blocking, simply reacting to new JSON blobs pushed by the backend as the agent navigates the web.

## Running Locally

Ensure you have installed the dependencies:
```bash
npm install
```

Start the Vite development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`.
