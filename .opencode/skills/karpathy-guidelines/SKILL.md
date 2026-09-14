---
name: karpathy-guidelines
description: Compact Karpathy discipline for coding tasks. Use when writing, editing, or reviewing code to prevent wrong assumptions, overengineering, noisy diffs, and unverified work. Supplements 00-task-router workflow, does not replace project-discovery, testing, or verification skills.
---

# Karpathy Guidelines — Compact Supplement

Behavioral add-on to the 00–17 workflow. Derived from Andrej Karpathy's observations on LLM coding pitfalls. Keep it loaded for non-trivial code work; use judgment for trivial one-liners.

Base rule: bias toward caution over speed, but don't slow down trivial tasks.

## 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask rather than guess.
- If multiple interpretations exist, present them — don't pick silently.
- Push back when a simpler approach exists.
- If confused, stop. Name what's unclear. Ask.

Pairs with: 00-task-router, 02-brainstorming, 05-systematic-debugging.

## 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If 200 lines could be 50, rewrite it.

Test: "Would a senior engineer call this overcomplicated?" If yes, simplify.

## 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor what isn't broken. Match existing style.
- Unrelated dead code: mention it, don't delete it.
- Remove only orphans YOUR changes created (imports/vars/functions).

Test: every changed line must trace directly to the user request.

## 4. Goal-Driven Execution

Define success criteria. Loop until verified.

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a reproducing test, then make it pass"
- "Refactor X" → "Tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

Strong criteria let you loop independently. Weak criteria ("make it work") need clarification.

Pairs with: 04-writing-plan, 06-tdd, 11-testing, 12-verification.

## Working If

- Diffs contain only requested changes
- No rewrites due to overcomplication
- Clarifying questions come before implementation
- No debug artifacts or secrets introduced
