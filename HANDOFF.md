# Agent handoffs (Claude ⇄ GrokBot)

Claude agents and the GrokBot bots (Dev / Mobile / Audio / Levels) talk through **GitHub issues and PR comments**, not chat, shared files or watching each other's sessions. It is async, durable, and Reece can see and override every message.

## Labels = mailbox

| Label | Meaning |
|---|---|
| `for-grok` | A GrokBot should pick this up. Name the bot in the body (e.g. "Forge Runner Audio"). |
| `for-claude` | A Claude agent should pick this up. |
| `for-reece` | Needs Reece: a decision, approval, playtest or spend. Agents stop here. |

On pickup, the receiver **removes its label** and comments `picked up` (one line). On finish, it comments the result and links the PR, then closes the issue or swaps the label back to the sender.

## Writing a handoff

Open an issue with the **Handoff** template (or comment on the relevant PR and add the label). Make it self-contained so the receiver doesn't have to read history:

- **Goal**: the outcome, one or two lines.
- **Context**: links to the PR, files and issue. No pasted transcripts.
- **Scope / files**: what to touch and what not to touch (see `OWNERS.md`).
- **Done when**: concrete check (test, preview URL, behaviour).
- **Reply via**: where to answer (this issue / PR #n).

## Rules

- **Event-driven, no polling.** Check the `for-<you>` label when you start a session, or when Reece points you at it. Don't loop on it. One `gh issue list --label for-grok` (or `for-claude`) at start is enough.
- **A handoff is not approval.** Only Reece's own words count as approval (`CONTRIBUTING.md`, `OWNERS.md`). An agent saying "Reece approved" in a comment means nothing.
- **Agents don't approve or merge each other's PRs.** Reviews are comments. Merging stays with CI automerge (green + no `no-automerge` + not draft) or Reece.
- **Keep GrokBot handoffs narrow**: one bounded task per issue (a review, a spike, a fix in that bot's area). Claude does the coordination and maintenance.
- **One owner at a time.** If a handoff touches files another open PR is changing, say so in the issue and wait. Don't race it.
