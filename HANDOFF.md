# Agent handoffs (Claude ⇄ GrokBot)

Claude agents and the GrokBot bots (Dev / Mobile / Audio / Levels) talk through **GitHub issues and PR comments**, not chat, shared files or watching each other's sessions. It is async, durable, and Reece can see and override every message.

## Quick start (copy-paste)

**Hand a task to a GrokBot.** Adding the label wakes Forge within seconds (tested in #143):

```
gh issue create --label for-grok --title "handoff: <short task>" --body "**To:** Forge Runner <Dev|Mobile|Audio|Levels>
**From:** <you>

**Goal:** <outcome>
**Context:** <PR/issue/file links>
**Scope / files:** <touch / don't touch>
**Done when:** <check>
**Reply via:** this issue"
```

To ask about an existing PR instead, comment on it, then run `gh pr edit <n> --add-label for-grok`.

**Pick up work for you (Claude).** Run this once at session start, not in a loop:

```
gh issue list --label for-claude
gh pr list --label for-claude
```

**Need Reece?** Add `for-reece` and stop. Don't wait in a loop.

**Re-wake** a handoff that got no reply: `gh issue edit <n> --remove-label for-grok`, then `--add-label for-grok`.

## Who said it: sign your comments

Every agent posts through Reece's GitHub account (`extremedonkey`), so the author name tells you nothing. **Start every handoff comment with your name in bold**, e.g. `**[Claude]**` or `**[Forge Runner Audio]**`. An unsigned comment from `extremedonkey` may be a bot, so never take it as Reece's approval. Approval only counts when Reece gives it directly in the agent's own chat.

## Labels = mailbox

| Label | Meaning |
|---|---|
| `for-grok` | A GrokBot should pick this up. Name the bot in the body (e.g. "Forge Runner Audio"). |
| `for-claude` | A Claude agent should pick this up. |
| `for-reece` | Needs Reece: a decision, approval, playtest or spend. Agents stop here. |

On pickup, the receiver **removes its label** and comments `**[name]** picked up` (one line). On finish, it comments the result and links the PR, then closes the issue or swaps the label back to the sender.

## Waking GrokBot

Adding `for-grok` to an issue or PR runs `.github/workflows/wake-grok.yml`, which makes one POST to the Grok Bot webhook routine **Forge Runner for-grok handoff**. That wakes Forge, which routes the handoff to the bot named on the `**To:**` line. Repo secrets, copied from Grok Bot → Routines: `GROK_BOT_WEBHOOK_URL` and `GROK_BOT_WEBHOOK_KEY` (sent as `Authorization`, with `Bearer ` added unless it already has a scheme). Without them the workflow skips and bots fall back to the session-start label check. To wake it again, remove the label and add it back.

When the bot picks it up, it removes `for-grok`, comments `**[bot name]** picked up`, and replies on the issue or PR. It never approves or merges.

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
