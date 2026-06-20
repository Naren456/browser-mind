# BrowserMind – Complete Technical Documentation

> **Author:** Narendra Sirvi (Naren456)  
> **Stack:** TypeScript · Node.js · Express · Playwright · React · Claude API (Anthropic)  
> **Type:** Autonomous Web Agent with ReAct Loop

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Concepts & Theory](#2-core-concepts--theory)
3. [System Architecture](#3-system-architecture)
4. [Component Deep Dive](#4-component-deep-dive)
5. [Data Flow – End to End](#5-data-flow--end-to-end)
6. [Key Design Decisions](#6-key-design-decisions)
7. [Known Limitations](#7-known-limitations)
8. [Deep Dive — How It Really Works Under the Hood](#8-deep-dive--how-it-really-works-under-the-hood)
9. [What to Study Next (CS Student Roadmap)](#9-what-to-study-next-cs-student-roadmap)
10. [Viva Questions & Model Answers](#10-viva-questions--model-answers)

---

## 1. Project Overview

BrowserMind is an **autonomous web agent** — a system where an LLM (Claude) can independently navigate websites, click buttons, fill forms, and extract information to complete a user-given goal — without any human intervention per step.

### What it does in plain language
You type: *"Go to Amazon, search for mechanical keyboards, and tell me the top 3 results under ₹3000."*  
BrowserMind: opens a real browser, navigates Amazon, searches, reads the results, and returns them to you — step by step, streamed live.

### What makes it non-trivial
- The agent must **plan** which action to take next (LLM reasoning)
- Execute that action on a real browser (Playwright)
- **Observe** the result (screenshot + DOM)
- Loop until the task is done or fails
- Stream all of this to the frontend in real time (SSE)

---

## 2. Core Concepts & Theory

### 2.1 The ReAct Pattern

ReAct (Reasoning + Acting), introduced by Yao et al. (2022), is the foundational paradigm your agent implements.

The loop is:

```
Thought → Action → Observation → Thought → Action → ...
```

In BrowserMind:
- **Thought** = Claude's internal reasoning (what should I do next?)
- **Action** = a tool call (`click_element`, `navigate_to`, `type_text`, etc.)
- **Observation** = the Playwright result fed back as `tool_result` in the next message

This is different from a simple "chat with a website" — the LLM doesn't just answer questions, it *acts* and *reacts* to real-world feedback in a loop.

**Why this matters:** The LLM alone cannot browse. Playwright alone has no intelligence. ReAct is the glue — it gives the LLM a body.

---

### 2.2 Set-of-Marks (SoM) Navigation

**The problem:** If you dump raw HTML into an LLM prompt, you're sending thousands of tokens of `<div>`, `<span>`, and noise. The LLM doesn't know which elements are interactive. CSS selectors like `#btn-checkout-3` are brittle — they break when the site updates.

**Your solution:** Before passing page content to the LLM, inject integer IDs (`[1]`, `[2]`, `[3]`...) onto every interactive element (buttons, links, inputs) in the live DOM using Playwright's `page.evaluate()`. The LLM then just says: *"interact with element 12."*

```
Before SoM:  "Click the checkout button"  → brittle, LLM guesses selector
After SoM:   interact_with_id(12)          → precise, deterministic
```

This technique was used in academic work at CMU and Google DeepMind and is also the basis for how commercial agents (like Claude's Computer Use) work.

**How it works in code:**
```typescript
// Playwright injects into the page's DOM
await page.evaluate(() => {
  const interactive = document.querySelectorAll('a, button, input, select, textarea');
  interactive.forEach((el, i) => {
    el.setAttribute('data-mark-id', String(i + 1));
    // Optionally overlay a label for screenshot mode
  });
});
```

---

### 2.3 Tool Use / Function Calling

Modern LLMs (Claude, GPT-4) support structured **tool use**: you define a schema of available functions, and the model responds with a structured JSON tool call instead of free text.

Your tool schema tells Claude what it *can* do:

| Tool | What it does |
|------|-------------|
| `navigate_to(url)` | Load a URL in the browser |
| `interact_with_id(id)` | Click element with SoM ID |
| `type_text(id, text)` | Type into an input field |
| `take_screenshot()` | Capture current page as base64 image |
| `extract_content()` | Pull readable text from the page |
| `scroll(direction)` | Scroll the page |
| `finish_task(result)` / `TASK_COMPLETED` | Signal task is done |

The LLM doesn't *execute* these — it *requests* them. Your backend intercepts the request, runs it in Playwright, and returns the result. This is the core loop.

**Why structured tool calls > free text:** If Claude outputs "click the button" in prose, you need a fragile NLP parser. With tool use, you get `{"name": "interact_with_id", "input": {"id": 12}}` — deterministic and parseable.

---

### 2.4 Server-Sent Events (SSE)

SSE is a **unidirectional** HTTP streaming protocol where the server pushes events to the client over a long-lived connection.

```
Client                         Server
  |------- GET /api/runs/:id/stream ------->|
  |<------- data: {"type":"step",...} -------|
  |<------- data: {"type":"action",...} -----|
  |<------- data: {"type":"done",...} --------|
```

**Why not WebSockets?** WebSockets are bidirectional and more complex to set up. For this use case (server pushes updates, client only watches), SSE is the correct and simpler choice. It uses standard HTTP, works through proxies/firewalls, and auto-reconnects on drop.

**Why not polling?** Polling would mean the client asks "any updates?" every second. SSE is push-based — lower latency, fewer requests, cleaner UX.

---

### 2.5 Vision Fallback (Multimodal LLM)

When SoM element mapping fails (e.g., the page uses a canvas element, or the DOM is shadow-DOM based), your agent falls back to sending a **screenshot as a base64 image** in the `messages` array.

Claude (claude-3 and above) is multimodal — it can accept images as input and reason about them. So the agent can say "here is what the browser currently looks like" and the LLM can respond with what to do next even when DOM parsing fails.

```
Strategy 1: SoM DOM traversal (fast, cheap, token-efficient)
      ↓ fails?
Strategy 2: Screenshot vision (slower, more expensive, more robust)
```

This hybrid is the production-grade approach.

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                          │
│                                                                  │
│   TaskInput ──── POST /api/runs ──────────────────────────────┐ │
│   StreamViewer ── GET /api/runs/:id/stream (SSE) ─────────┐   │ │
└───────────────────────────────────────────────────────────────────┘
                                                           │   │
                        ┌──────────────────────────────────┘   │
                        │                                       │
┌───────────────────────▼───────────────────────────────────────▼──┐
│                      BACKEND (Express + TypeScript)               │
│                                                                   │
│  ┌─────────────┐   ┌────────────┐   ┌──────────────────────────┐ │
│  │  RunStore   │   │  RunRouter │   │     AgentRunner          │ │
│  │ (in-memory) │◄──│  /api/runs │──►│  ReAct Loop (async)      │ │
│  └─────────────┘   └────────────┘   └──────────┬───────────────┘ │
│                                                 │                 │
│                         ┌───────────────────────┤                 │
│                         ▼                       ▼                 │
│              ┌──────────────────┐   ┌───────────────────────────┐ │
│              │  Anthropic API   │   │     ToolExecutor           │ │
│              │  (Claude claude-sonnet-4-6)   │   │  (Playwright actions)     │ │
│              └──────────────────┘   └────────────┬──────────────┘ │
└───────────────────────────────────────────────────────────────────┘
                                                   │
                        ┌──────────────────────────┘
                        ▼
         ┌──────────────────────────────┐
         │        Playwright            │
         │  (Chromium browser instance) │
         │                              │
         │  ┌──────────────────────┐   │
         │  │   SoM Injector       │   │
         │  │   (DOM labelling)    │   │
         │  └──────────────────────┘   │
         │  ┌──────────────────────┐   │
         │  │  Screenshot Capture  │   │
         │  └──────────────────────┘   │
         └──────────────────────────────┘
```

---

## 4. Component Deep Dive

### 4.1 AgentRunner (Core Loop)

The heart of the project. Pseudocode representation:

```typescript
async function runAgent(task: string, runId: string) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  const messages: Message[] = [
    { role: "user", content: task }
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    // 1. Call Claude with current message history + tool schemas
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      tools: TOOL_SCHEMAS,
      messages
    });

    // 2. Emit step to SSE stream
    emit(runId, { type: "step", data: response });

    // 3. Check for completion
    if (response includes TASK_COMPLETED) break;

    // 4. Extract tool calls from response
    const toolCalls = extractToolCalls(response);

    // 5. Execute each tool in Playwright
    const toolResults = await Promise.all(
      toolCalls.map(tc => executeTool(page, tc))
    );

    // 6. Append assistant response + tool results to history
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    // Loop continues...
  }

  await browser.close();
}
```

### 4.2 RunStore

A simple in-memory map:

```typescript
const runs = new Map<string, Run>();

interface Run {
  id: string;
  status: "running" | "completed" | "failed";
  steps: Step[];
  sseClients: Response[]; // Express response objects
}
```

When a new step is emitted, it iterates over `sseClients` and writes to each. New SSE connections get the full history replayed so late-joining clients see everything.

### 4.3 ToolExecutor

Routes a Claude tool call to a Playwright action:

```typescript
async function executeTool(page: Page, toolCall: ToolCall): Promise<string> {
  switch (toolCall.name) {
    case "navigate_to":
      await page.goto(toolCall.input.url);
      return "Navigation successful";

    case "interact_with_id":
      const el = page.locator(`[data-mark-id="${toolCall.input.id}"]`);
      await el.click();
      return `Clicked element ${toolCall.input.id}`;

    case "type_text":
      const input = page.locator(`[data-mark-id="${toolCall.input.id}"]`);
      await input.fill(toolCall.input.text);
      return `Typed into element ${toolCall.input.id}`;

    case "take_screenshot":
      const screenshot = await page.screenshot({ encoding: "base64" });
      return screenshot; // returned as image in next message

    // ...etc
  }
}
```

### 4.4 SSE Endpoint

```typescript
app.get("/api/runs/:id/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const run = runStore.get(req.params.id);

  // Replay history for late connections
  run.steps.forEach(step => {
    res.write(`data: ${JSON.stringify(step)}\n\n`);
  });

  // Register as live client
  run.sseClients.push(res);

  // Clean up on disconnect
  req.on("close", () => {
    run.sseClients = run.sseClients.filter(c => c !== res);
  });
});
```

---

## 5. Data Flow – End to End

```
User types task
      │
      ▼
POST /api/runs  →  creates Run, assigns UUID, starts AgentRunner async
      │
      ▼ (returns run ID immediately)
Frontend opens SSE stream: GET /api/runs/:id/stream
      │
      ▼
AgentRunner Step 1:
  Claude called with task + tool schemas
  Claude responds: { tool_use: navigate_to("https://amazon.in") }
  Playwright executes navigation
  Result "Navigation OK" → appended to messages
  SSE emits: { type: "step", action: "navigate_to", result: "OK" }

AgentRunner Step 2:
  Claude sees page, uses SoM labels
  Claude responds: { tool_use: type_text(id: 3, text: "mechanical keyboard") }
  Playwright types into search box
  SSE emits: { type: "step", action: "type_text", ... }

... (N steps) ...

AgentRunner Step N:
  Claude responds: TASK_COMPLETED + final answer
  SSE emits: { type: "done", result: "Top 3 keyboards: ..." }
  Browser closes
  Run marked completed
```

---

## 6. Key Design Decisions

| Decision | Why |
|---|---|
| TypeScript over JavaScript | Type safety on tool schemas prevents runtime crashes when Claude returns malformed tool calls |
| SSE over WebSocket | Task output is unidirectional; SSE is simpler, HTTP-native, and auto-reconnects |
| SoM over raw HTML | Reduces token usage by ~80%, makes element targeting deterministic |
| Hybrid SoM + vision | No single strategy works on all websites; fallback is essential for robustness |
| Per-request Playwright instance | Isolation between runs; no state leakage |
| In-memory RunStore | Acceptable for college project/demo scope; production would use Redis or SQLite |

---

## 7. Known Limitations

### L1: Context Window Bloat (Critical)
Every step appends a base64 screenshot (~50–100KB as text) to `messages`. By step 20, the payload sent to Claude per turn is enormous. This will cause:
- Token limit errors on long tasks
- High API costs
- Slow responses

**Fix:** Sliding window — keep only last 5 screenshots in history.

### L2: String Sentinel for Completion
The loop breaks when it detects the string `TASK_COMPLETED`. LLMs can paraphrase, add punctuation, or embed it mid-sentence, causing the agent to overshoot `MAX_STEPS`.

**Fix:** Use a dedicated `finish_task(result)` tool call.

### L3: No Parallelism
One Playwright browser per run, steps are sequential. You cannot parallelize sub-tasks.

### L4: No Persistence
RunStore is in-memory. Server restart = all runs lost.

### L5: No Error Recovery Strategy
If a tool fails 3 times in a row (e.g., element not found), the agent just tries again. There's no escalation strategy.

---

## 8. Deep Dive — How It Really Works Under the Hood

This section goes beyond what you need for the viva and into what you need to truly understand this project as a CS student.

---

### 8.1 Why Node.js can run the agent loop without blocking

Node.js runs on a **single thread** with an **event loop**. This seems like it would break for an agent that does 20 sequential async operations — but it doesn't, because of how `async/await` works under the hood.

When you `await page.goto(url)`, Node does not block the thread. It registers a callback with the OS (via libuv) for when the I/O completes, then **releases the thread** to handle other work — like another incoming SSE connection. When the I/O is done, the callback is queued on the event loop and the agent resumes.

```
Thread:   [goto starts]──────────────[goto done, resume]──[click starts]──...
Event loop: ...handles other requests while goto is in-flight...
```

This is why two users can run agents simultaneously without one blocking the other — both are in flight, both paused at different `await` points, and the single thread services whichever one has a result ready.

**The CS concept:** This is the **reactor pattern** — one thread, many concurrent I/O-bound tasks via non-blocking callbacks. Compare to the **thread-per-request** model (Java servlet containers), where each request gets its own OS thread. Node wins for I/O-heavy workloads; threads win for CPU-heavy work. Your agent is almost entirely I/O (network calls to Claude, browser I/O via Playwright) — so Node is a correct choice.

---

### 8.2 How `async/await` actually works (desugared)

`async/await` is syntactic sugar over **Promises**, which are syntactic sugar over **callbacks**. Knowing this helps you debug the agent loop.

```typescript
// What you write:
const result = await page.goto(url);

// What it compiles to (roughly):
page.goto(url).then(result => {
  // everything after the await runs here
});
```

The `AgentRunner` loop is essentially a state machine. Each `await` is a suspension point. The V8 engine compiles your `async function` into a hidden class with a `state` integer — each `await` advances the state and schedules the continuation as a microtask.

**Microtasks vs macrotasks:** Promise continuations (`.then`) are microtasks — they run before the next I/O event. `setTimeout` callbacks are macrotasks. This ordering matters if you ever mix timers with `await` in the agent.

---

### 8.3 How the LLM actually picks a tool (the mechanics)

When you send a tool schema to Claude, it doesn't run any code — it predicts tokens. The tool schema is serialized into the prompt (in a special system format), and Claude was fine-tuned on datasets where the correct output for "I need to click a button" is a structured JSON tool call.

Internally, the model outputs tokens one by one. When it outputs `{"type": "tool_use", "name": "interact_with_id"`, the Anthropic API detects this pattern and stops streaming text — it instead returns a structured `tool_use` content block to your backend. This is called **constrained decoding** at the API level.

**Why tool descriptions matter so much:** The model decides which tool to call based on the natural language descriptions in your schema. If `interact_with_id` is described as "clicks an element", the model understands when to use it. A vague description leads to wrong tool selection or hallucinated arguments.

**Temperature:** At inference time, there's a sampling temperature that controls randomness. For tool use, lower temperature = more deterministic tool selection. Anthropic likely uses a low temperature internally for structured outputs. This is why Claude's tool calls are usually precise even though it's a probabilistic model.

---

### 8.4 The message history as a data structure

Every API call sends the **full conversation history** as a list. Claude has no persistent memory between calls. Your `messages` array is the agent's entire working memory — a manually maintained sliding context window.

```
messages = [
  { role: "user",      content: "task" },
  { role: "assistant", content: [tool_use_block] },
  { role: "user",      content: [tool_result_block] },
  { role: "assistant", content: [tool_use_block] },
  { role: "user",      content: [tool_result_block + screenshot_image] },
  ...
]
```

**Token counting:** Each message is tokenized. A token ≈ 4 characters of English text. A base64 screenshot string at ~80KB ≈ 20,000 tokens. Claude Sonnet has a 200K token context window. At 20,000 tokens per screenshot, you can fit ~10 screenshots before hitting the limit — which is why context window management is a critical production concern.

**Why `role: "user"` for tool results?** The Anthropic API requires tool results to be in a `user` role message. This is because the API models the conversation as a dialogue between a user (the environment/tool executor) and an assistant (Claude). Your backend plays the role of "user" every time it returns tool results.

---

### 8.5 How Playwright controls the browser (the protocol)

Playwright doesn't use keyboard/mouse simulation at the OS level (like AutoHotkey does). It communicates with Chromium over the **Chrome DevTools Protocol (CDP)** — a WebSocket-based JSON-RPC API that Chromium exposes for debugging.

```
Playwright backend ──WebSocket──► Chromium CDP server
                     {"method": "Input.dispatchMouseEvent", ...}
                     {"method": "DOM.querySelector", ...}
```

This means Playwright runs at the browser engine level — it can access the real DOM, intercept network requests, execute JavaScript, capture screenshots, and control navigation. It's fundamentally different from screen scraping tools that look at pixels.

**Why `page.evaluate()` works:** When you inject your SoM IDs with `page.evaluate(() => { document.querySelectorAll(...) })`, Playwright serializes your function, sends it over CDP as a `Runtime.callFunctionOn` command, Chromium executes it in the page's JavaScript context, and returns the result. You're literally running JavaScript inside the browser page from your Node.js process.

---

### 8.6 SSE — the HTTP streaming mechanism in detail

SSE uses a standard HTTP response with `Content-Type: text/event-stream`. The server holds the connection open and writes newline-delimited chunks:

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"step","action":"navigate_to"}\n\n
data: {"type":"step","action":"interact_with_id"}\n\n
data: {"type":"done","result":"..."}\n\n
```

Each `data:` line followed by `\n\n` is one event. The browser's `EventSource` API parses this and fires `onmessage` events. The connection stays alive because the response never gets a final `Content-Length` or connection close — the OS keeps the TCP socket open.

**Backpressure:** If the client reads slower than the server writes, the data piles up in the kernel's TCP send buffer. If that fills, `res.write()` in Node.js will block (or more accurately, return `false` and you should wait for the `drain` event). Your project doesn't handle this — which is fine for a demo where the client and server are on localhost, but matters in production over slow networks.

---

### 8.7 Why base64 for screenshots

Binary data (image bytes) can't be embedded directly in JSON or HTTP text streams without corruption — certain byte sequences (null bytes, control characters) have special meanings in text protocols. Base64 encoding converts every 3 bytes of binary into 4 printable ASCII characters, making it safe to embed anywhere.

Cost: 33% size overhead. An 80KB PNG becomes ~107KB of base64 text. This is why screenshots inflate your token count so aggressively.

**Alternative:** You could save screenshots to disk and pass only the file path to Claude. But Claude's API requires images to be base64 inline (or hosted URLs). Hosted URLs would require a separate storage service — more infrastructure for a college project.

---

## 9. What to Study Next (CS Student Roadmap)

Your project touches 7 distinct areas of CS. Here's what to read to go deeper in each.

### 9.1 LLM Internals
Understanding what Claude is actually doing when it reasons.

- **Attention mechanism** — "Attention Is All You Need" (Vaswani et al., 2017). The original transformer paper. Read sections 3.2 and 3.3.
- **How GPT generates tokens** — Andrej Karpathy's "nanoGPT" repo on GitHub. 300 lines that implement a GPT from scratch. Build it.
- **Tokenization** — understand BPE (Byte Pair Encoding). Run `tiktoken` on your own text and see how words split into subwords.

### 9.2 Agent Frameworks
What comes after hand-rolling a ReAct loop.

- **LangGraph** (LangChain) — graph-based agent state machines. Your `AgentRunner` is essentially a manual implementation of what LangGraph provides. Read their conceptual docs.
- **AutoGen** (Microsoft) — multi-agent frameworks where agents talk to each other.
- **ReAct paper** — "ReAct: Synergizing Reasoning and Acting in Language Models" (Yao et al., 2022). arxiv:2210.03629. 15 pages, very readable.

### 9.3 Browser Automation & Web Protocols
Going deeper on how Playwright works.

- **Chrome DevTools Protocol** — read the CDP docs at `chromedevtools.github.io/devtools-protocol`. Understand `DOM`, `Runtime`, `Input`, and `Network` domains.
- **Web Accessibility Tree** — `page.accessibility.snapshot()` in Playwright. Learn how screen readers traverse the DOM — it's a better signal for agents than raw HTML.
- **Shadow DOM** — MDN docs on Web Components. Understand why `querySelectorAll` doesn't pierce shadow roots and how to handle it.

### 9.4 Async Systems & Node.js Internals
Understanding why your server works the way it does.

- **libuv** — the C library under Node.js that handles async I/O. Read the libuv docs to understand the event loop at the OS level.
- **"Node.js Event Loop, Timers, and process.nextTick"** — the official Node.js docs page on the event loop. Understand the 6 phases.
- **Backpressure in Node.js streams** — Node.js streams guide. Understand `readable`, `writable`, `pipe`, and `drain`.

### 9.5 HTTP & Streaming Protocols
Understanding SSE and when to use what.

- **HTTP/1.1 spec** — RFC 7230. Understand `Transfer-Encoding: chunked` — that's what keeps your SSE connection alive.
- **SSE vs WebSocket vs Long Polling** — read the comparison on the MDN SSE page. Know the trade-offs cold for your viva.
- **HTTP/2 server push** — understand why SSE is preferred over HTTP/2 push for most use cases.

### 9.6 Prompt Engineering & LLM Reliability
Making your agent more robust.

- **Anthropic's prompt engineering docs** — `docs.anthropic.com/en/docs/build-with-claude/prompt-engineering`
- **Chain-of-Thought prompting** — "Chain-of-Thought Prompting Elicits Reasoning in Large Language Models" (Wei et al., 2022). Understand why asking Claude to "think step by step" improves accuracy.
- **Structured outputs** — study JSON schema and how tool schemas constrain LLM output. Read the Anthropic tool use docs thoroughly.

### 9.7 Production Systems Thinking
What separates a demo from a real system.

- **"Designing Data-Intensive Applications"** (Martin Kleppmann) — chapters on reliability, scalability, and maintainability. The most important book for backend CS students.
- **Rate limiting algorithms** — token bucket vs leaky bucket vs sliding window. Implement one from scratch.
- **Observability** — understand structured logging (JSON logs), metrics (counters, histograms), and distributed tracing. Your agent has no observability right now — adding it is a production milestone.

---

## 10. Viva Questions & Model Answers

---

### Section A: Fundamentals

**Q1. What is an AI agent? How is BrowserMind an agent and not just a chatbot?**

A chatbot takes input, runs one inference, returns output — no external state, no looping. An agent has a **perception-action loop**: it perceives the environment (browser state), decides an action, executes it, observes the new state, and repeats. BrowserMind has this loop — Claude doesn't just answer, it acts, observes the result, and plans the next move. The key difference is **agency over time**.

---

**Q2. Explain the ReAct pattern. What does "Reasoning + Acting" mean in the context of your project?**

ReAct interleaves reasoning (chain-of-thought) with action. In BrowserMind:
- **Reasoning:** Claude internally thinks about what to do next ("The search box is element 4, I should type the query into it")
- **Acting:** Claude outputs a tool call (`type_text(id: 4, text: "mechanical keyboard")`)
- **Observation:** Playwright executes the action, the result is returned as a `tool_result`

This continues in a loop. The key insight is that feedback from the environment (the observation) changes what the LLM reasons about next — it's not a static Q&A.

---

**Q3. What is Set-of-Marks? Why not just send the raw HTML to Claude?**

Raw HTML sent to an LLM has three problems: it's token-expensive (a typical Amazon page has 50,000+ tokens of HTML), it contains massive noise (scripts, styles, hidden elements), and the LLM has to guess selectors that may be wrong or brittle.

SoM labels each interactive element with an integer ID injected into the DOM. The LLM only receives a clean list like `[1] Search Box  [2] Cart Button  [3] Sign In`. When it wants to click, it says `interact_with_id(2)` — precise and cheap. It's the same idea as pointing at objects in an image with numbered circles.

---

**Q4. What is Playwright? Why did you choose it over Selenium or Puppeteer?**

Playwright is Microsoft's browser automation library. It supports Chromium, Firefox, and WebKit. Key advantages over alternatives:
- **vs Selenium:** Playwright has a modern async API, better auto-waiting (waits for elements to be ready, not just visible), and is significantly faster
- **vs Puppeteer:** Playwright supports multiple browsers, has a better locator API, and handles shadow DOM natively
- For an agent that needs robust, reliable element interaction, Playwright's auto-waiting is critical — it prevents the agent from clicking elements before they're interactive.

---

**Q5. What is tool use / function calling in LLMs? How does it work?**

Tool use is a capability where an LLM, instead of responding with free text, responds with a structured JSON object specifying which function to call and with what arguments.

You define a JSON schema of available tools. The LLM sees the schemas as context. When it decides to act, it outputs:
```json
{"type": "tool_use", "name": "navigate_to", "input": {"url": "https://google.com"}}
```

Your backend parses this, executes the action, and returns the result as a `tool_result` message. The LLM sees the result in the next turn. This is fundamentally different from parsing prose — it's deterministic and typed.

---

### Section B: Architecture & Design

**Q6. Why did you use SSE instead of WebSockets for streaming?**

The agent's communication is **unidirectional** — the server pushes step updates to the client, and the client never sends messages back over that channel. For unidirectional streaming, SSE is the correct choice because:
- It uses standard HTTP (no protocol upgrade)
- It auto-reconnects natively in browsers
- It's simpler to implement
- It works through most proxies and CDNs

WebSockets are bidirectional — they're appropriate for chat apps, real-time collaboration, or games where the client also sends frequent messages. Using WebSockets here would be over-engineering.

---

**Q7. How does your frontend know the agent is still running vs has finished?**

SSE events are typed. The backend emits events with a `type` field: `"step"` during the loop, and `"done"` or `"error"` to signal termination. The frontend switches UI state (running spinner → results view) based on receiving a `"done"` event.

---

**Q8. What happens if the user closes their browser tab mid-run?**

The browser closes the SSE connection (triggers the `req.on("close")` handler). The client is removed from `run.sseClients`. However, the `AgentRunner` is running asynchronously — it doesn't know or care about SSE clients. The task continues to completion in the background. If the user re-opens and reconnects, they'll receive the full step history (replayed from `run.steps`).

---

**Q9. What is the message history structure you send to Claude each turn?**

It's a standard OpenAI/Anthropic messages array:
```json
[
  {"role": "user", "content": "Find top 3 keyboards on Amazon"},
  {"role": "assistant", "content": [{"type": "tool_use", "name": "navigate_to", ...}]},
  {"role": "user", "content": [{"type": "tool_result", "content": "Navigation OK"}]},
  {"role": "assistant", "content": [{"type": "tool_use", "name": "type_text", ...}]},
  ...
]
```

Each turn appends the assistant's response and the tool results. Claude sees the full history every time — it has no memory between API calls, so you must send everything.

---

**Q10. Why is context window management a problem for agents specifically?**

A regular chatbot has short, text-only exchanges. An agent has: N steps × (LLM reasoning text + tool calls + tool results + screenshots). Screenshots encoded as base64 strings are large — 50–150KB per screenshot as text. After 20 steps, you might be sending 3–5MB of data to the API per turn, which exceeds Claude's context window (~200K tokens ≈ ~800KB of text). Your project is at risk of this on long tasks. The fix is a sliding window over screenshots.

---

### Section C: LLM & AI Concepts

**Q11. Is Claude "understanding" the webpage, or something else?**

Claude is doing **pattern matching at scale**, not understanding in a human sense. It was trained on text (and images) from the internet — it has learned associations between what interactive elements look like, what tasks mean, and what sequences of actions produce desired outcomes. When it looks at a SoM-labeled page, it's applying learned patterns about web navigation. It's not "understanding" in a philosophical sense, but the practical result is similar.

---

**Q12. What is a "system prompt" and how do you use it in BrowserMind?**

A system prompt is a special instruction block passed to the LLM before the user conversation. In BrowserMind, the system prompt:
- Defines the agent's role ("You are an autonomous web agent")
- Describes available tools and how to use them
- Sets constraints (detect loops and switch strategy, never navigate away from task scope)
- Defines the completion signal

Quality of the system prompt directly determines agent reliability. Poorly described tools lead to bad tool calls.

---

**Q13. What is "hallucination" and how does it affect your agent?**

Hallucination is when an LLM generates text that is factually incorrect or made up. In an agent context, it manifests as:
- Calling `interact_with_id(99)` when there are only 20 elements on the page
- Claiming TASK_COMPLETED when it hasn't navigated to the right page
- Making up search results instead of actually reading the page

Your agent mitigates this by: grounding the LLM with real DOM observations, requiring tool use (structured, verifiable) rather than free text, and catching Playwright errors (e.g., element 99 not found) and returning them as `tool_result` so Claude can self-correct.

---

**Q14. What is "grounding" in the context of LLM agents?**

Grounding means connecting the LLM's abstract reasoning to concrete, verifiable external state. An ungrounded LLM can only work with what it was trained on. A grounded agent (like BrowserMind) reads the *actual current state* of the browser — real DOM, real screenshots, real error messages — and feeds that back into context. This prevents the LLM from reasoning about a page that doesn't exist or has changed.

---

**Q15. Could you replace Claude with an open-source model like LLaMA? What would break?**

Technically yes, but practically several things would degrade:
- **Tool use quality:** Claude is fine-tuned specifically for reliable function calling. Smaller open-source models (LLaMA 3 8B) often mis-format tool calls, call non-existent tools, or call tools with wrong arguments
- **Multimodal:** Vision fallback requires a multimodal model. LLaMA 3 base models are text-only (LLaMA 3.2 Vision exists but is less capable)
- **Long context:** Managing 20 steps of agent history needs a large context window. LLaMA 3.1 8B has 128K context — feasible, but tighter
- **Instruction following:** Complex multi-step instructions in the system prompt require strong instruction following

---

### Section D: Advanced / Deep-Dive

**Q16. What is the difference between a ReAct agent and a Plan-then-Execute agent?**

- **ReAct:** Plans and acts interleaved — each step's plan is informed by the previous step's observation. Adaptive, handles surprises, but can meander.
- **Plan-then-Execute:** First generates a complete plan (step 1: navigate, step 2: search, etc.), then executes without replanning. Faster, but fails on dynamic pages where the plan assumptions don't hold.

BrowserMind uses ReAct, which is better for web tasks because websites are unpredictable (CAPTCHAs, unexpected modals, page load failures).

---

**Q17. What is shadow DOM and why might your SoM approach fail on it?**

Shadow DOM is a Web Components feature that encapsulates DOM subtrees. Elements inside a shadow root are not accessible via standard `document.querySelectorAll()` — they're in a separate DOM tree. Your SoM injector uses `querySelectorAll('a, button, input...')` which **does not** pierce shadow roots by default. So interactive elements inside web components (common in modern SPAs) would get no SoM label.

**Fix:** Use `page.locator('button')` which uses Playwright's locator API that can be configured to pierce shadow DOM, or recursively traverse `shadowRoot` nodes.

---

**Q18. How would you add memory to BrowserMind so it remembers past tasks?**

Two types of memory:
- **Short-term (within a session):** Already implemented — the `messages` array is the agent's working memory.
- **Long-term (across sessions):** You would need to embed task summaries into a vector database (e.g., ChromaDB, Pinecone). Before starting a new task, query the DB for similar past tasks and inject them as "past experience" into the system prompt. This is called **episodic memory** or **RAG (Retrieval Augmented Generation)**.

---

**Q19. If two users run agents simultaneously, what happens in your current architecture?**

Each `POST /api/runs` creates an independent `Run` entry in `RunStore` with its own UUID, its own Playwright browser instance, and its own SSE client list. They run concurrently (Node.js handles them via the event loop + async/await). There's no shared state between runs, so they don't interfere.

**Problem:** 10 simultaneous users = 10 Chromium processes. Each takes ~200MB RAM. 50 users = 10GB RAM — server crash. This is why rate limiting is a production concern.

---

**Q20. What would you change to make this production-ready?**

| Area | Change |
|---|---|
| Persistence | Replace RunStore with SQLite/Redis |
| Context Window | Sliding window for screenshots |
| Completion | Replace `TASK_COMPLETED` string with `finish_task()` tool |
| Rate Limiting | Max N concurrent runs, per-IP limits |
| Auth | Bearer token or session auth on API routes |
| Testing | Integration tests against mock HTTP server |
| Observability | Structured logs with step timings, tool success rates |
| Cost Control | Token counting per run, budget cap |

---

*Document generated based on BrowserMind repository review — github.com/Naren456/browser-mind*
