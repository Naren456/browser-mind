# Design Rationale: Industrial Telemetry

This document outlines the aesthetic and structural choices for the BrowserMind operator console.

## The Subject Matter
BrowserMind is not a consumer SaaS or a friendly AI chatbot. It is a tool for a grader to observe, in real-time, an LLM making sequential decisions to drive a headless browser. The core design problem is **telemetry and auditability**: the viewer must trust the process and instantly comprehend what the machine is doing, when it did it, and what the screen looked like at that exact millisecond. 

## Pass 1 Decisions

### Palette
We rejected the default dark-mode "glow" (purple/neon gradients) and the Dribbble-standard "warm cream with terracotta accents."
Instead, we built a high-contrast, brutalist light mode. 
- `--bg-canvas: #F4F4F5` — Provides dead space framing the active panels.
- `--bg-panel: #FFFFFF` — Stark white for data panels, giving a raw, unstyled "document" feel.
- `--ink-main: #09090B` — Pure near-black for text and rigid 1px grid borders.
- `--accent-run: #2563EB` — A pure, utilitarian blueprint blue. No gradients.
- `--accent-error: #DC2626` — Diagnostic red.

*Reasoning: A flat, border-heavy light mode feels like a technical schematic or an engineering readout. It emphasizes data over decoration.*

### Typography
- **Display**: System sans (`-apple-system`), tight tracking, uppercase, weight 800.
- **Body**: `Inter`.
- **Utility**: `IBM Plex Mono`.

*Reasoning: By elevating `IBM Plex Mono` to the primary font for logs, timestamps, and tool arguments, we lean into the fact that this app displays literal machine output. We are not trying to hide the JSON; we are typesetting it to be as readable as possible.*

### Signature Element: The Telemetry Tape
Instead of chat bubbles or rounded cards, the `StepLog` is a continuous timeline. Timestamps run down a strict left column, locked to the millisecond. Action data occupies the right column. Each entry is separated by a harsh 1px black rule.

*Reasoning: Chat bubbles imply a conversation. A ticker tape implies a continuous, unyielding process log. This matches the reality of observing an autonomous agent loop.*
