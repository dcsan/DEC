---
description: Commit all pending changes as separate logical commits (one message per item), then push
---

Review everything pending with `git status` and `git diff`, then commit it all — but as **multiple commits grouped by logical change**, each with its own descriptive message. Do NOT squash unrelated work into one commit.

1. Inspect the full working tree (`git status`, `git diff`, and `git diff --staged`). List every changed/untracked path.
2. Group the changes into logical units — one unit per distinct feature, fix, or concern. A file that spans two concerns can be split with `git add -p`.
3. For each group, in order:
   - Stage only that group's files: `git add <paths>` (NOT `git add -A`).
   - Commit it with a message describing just that change.
4. After all groups are committed, run `git status` to confirm the tree is clean (nothing left unstaged), then push once.

Rules:

- **Never `git add -A` everything into a single commit.** Stage and commit each logical group separately so the history reads as one commit per item.
- **Don't commit stray artifacts** (DB dumps, build output, temp files, anything that doesn't belong in the repo). Call them out and leave them unstaged rather than committing them.
- If on the default branch (`main`), branch first before committing.
- Commit message format for each commit:
  - Brief summary line (50 chars or less)
  - Blank line
  - Optional body with bullet points covering that group's changes
- do NOT include any claude branding.
