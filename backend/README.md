# BrowserMind Backend Architecture

This directory contains the Node.js / Express backend that powers the BrowserMind autonomous web agent.

## Core Architecture

The backend is structured around a central **ReAct (Reasoning and Acting) loop** driven by an LLM (via OpenRouter) and a headless Chromium browser managed by Playwright.

```mermaid
sequenceDiagram
    participant User
    participant Express as Express (routes.ts)
    participant Agent as Agent (agent.ts)
    participant LLM as OpenRouter LLM
    participant Browser as Playwright (actions.ts)
    
    User->>Express: POST /api/runs { task }
    Express-->>User: runId
    User->>Express: GET /api/runs/:id/events (SSE)
    
    Express->>Agent: runAgent(task)
    Agent->>Browser: launch(about:blank)
    
    loop ReAct Loop (Max 30 Steps)
        Agent->>LLM: Send history + task + DOM
        LLM-->>Agent: Reasoning + Tool Call
        
        alt Tool Call requested
            Agent->>Browser: Execute action (e.g. click, type)
            Browser-->>Agent: Success/Error
            Agent->>Browser: take_screenshot()
            Agent->>Express: emit 'step' event
            Express-->>User: SSE stream (Live Viewport & Tape)
        else TASK_COMPLETED
            Agent->>Express: emit 'done'
            break
        end
    end
```

### 1. The ReAct Agent Loop (`src/agent/agent.ts`)
The `runAgent` function orchestrates the core loop:
- **Initialization**: The agent starts with a blank Playwright browser (`about:blank`).
- **Loop**: The agent runs a continuous loop (capped at a maximum number of steps, usually 30) where it:
  1. Sends the user's task, system prompt, and interaction history to the LLM.
  2. Receives a response containing reasoning and/or a tool call.
  3. Executes the requested tool via the `toolExecutor`.
  4. Takes a screenshot of the current browser state.
  5. Feeds the tool execution result (success/error/data) back into the conversation context for the next iteration.
- **Completion**: The agent breaks the loop and finalizes the run when it explicitly outputs the `TASK_COMPLETED` string.

### 2. Browser Automation (`src/browser/actions.ts` & `browserController.ts`)
We use **Playwright** for robust browser automation. The `BrowserController` handles context and page creation, while `BrowserActions` contains the concrete implementation of every tool (e.g., clicking, typing, navigating).

**Set-of-Marks (SoM) Navigation:**
Instead of relying purely on complex CSS selectors (which are fragile) or passing the entire HTML DOM to the LLM (which consumes too many tokens), we use a Hybrid DOM Mapping approach:
- The `analyze_page_structure` tool iterates through the DOM and builds a lightweight JSON dictionary mapping a unique integer ID to interactive elements.
- The LLM receives this clean, minified map (e.g., `{ 12: { role: 'button', name: 'Submit' } }`).
- The LLM then uses the `interact_with_id` tool, passing the ID. The backend resolves this ID back to the Playwright element handle to execute the action.

### 3. API & Event Streaming (`src/server/routes.ts`)
The backend communicates with the frontend via standard HTTP and Server-Sent Events (SSE):
- `POST /api/runs`: Accepts a `{ task: string }` payload, generates a unique Run ID, and kicks off the asynchronous agent loop.
- `GET /api/runs/:runId/events`: An SSE endpoint that streams every step, tool execution, and screenshot URL to the frontend in real-time, allowing the "Telemetry Tape" to update live.

## Prompt Engineering & Type (`src/agent/systemPrompt.ts`)

The agent is powered by a strictly defined **System Prompt**.

### Prompt Type
It is a **Zero-shot, Tool-Augmented System Prompt**. It strictly defines the persona, the available tools, and the exact constraints the model must follow.

### Key Prompt Constraints
1. **Goal-Orientation**: The prompt explicitly instructs the model to avoid "hallucinations" (writing actions in text without invoking tools) and to focus purely on the user's task.
2. **Anti-Looping**: The model is instructed to analyze its own action history to detect if it is repeating failed actions, forcing it to try alternative CSS selectors or use `analyze_page_structure` if stuck.
3. **Implicit Tooling**: The prompt explains that Playwright handles auto-scrolling, so the LLM does not need to waste steps on scrolling before clicking.
4. **Autonomous Start**: The model is told it starts on a blank page and must proactively use `navigate_to_url` to begin its task based on the user's natural language request.

## Directory Structure
- `src/server/` - Express setup, routing, and in-memory run store.
- `src/agent/` - The core LLM orchestration loop and system prompt.
- `src/browser/` - Playwright lifecycle management and DOM interaction logic.
- `src/tools/` - JSON schemas for OpenRouter tools (`toolDefinitions.ts`) and the execution router (`toolExecutor.ts`).
