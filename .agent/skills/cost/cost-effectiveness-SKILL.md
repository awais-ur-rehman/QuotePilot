---
name: cost-effectiveness
description: "Cost-effectiveness and resource optimization skill for Claude Code. ALWAYS use this skill to govern Claude Code's behavior on every task. This skill prevents unnecessary file reads, redundant tool calls, excessive code regeneration, and token waste. It enforces efficient workflows: reading files once, making targeted edits instead of full rewrites, batching related changes, and avoiding speculative work. Trigger this skill on EVERY interaction — it is always active as a behavioral constraint, not an optional tool. This is the most important skill for keeping Claude Code usage within budget."
---

# Cost-Effectiveness Skill — Resource Optimization

This skill is a PERMANENT behavioral constraint. Apply these rules to EVERY action.

---

## Core Principles

### 1. Read Once, Remember Always

- NEVER read the same file twice in one task
- Before reading a file, check if you already have its contents in context
- If you've seen a file in this conversation, reference it from memory
- When you need to understand a project, read the root structure FIRST, then only the specific files needed

### 2. Edit, Don't Rewrite

- Use targeted edits (str_replace, sed) instead of rewriting entire files
- If changing 5 lines in a 200-line file, edit those 5 lines — don't regenerate all 200
- ONLY rewrite a full file when >50% of it is changing
- When creating a new file, write it COMPLETE in one pass — don't create then immediately edit

### 3. Batch Related Changes

- If a feature needs changes in 3 files, plan all 3 changes BEFORE starting
- Make all related changes in one pass, not one file at a time with verification between each
- Group imports, type changes, and refactors that touch the same files

### 4. No Speculative Work

- NEVER create files "we might need later"
- NEVER add features not explicitly requested
- NEVER refactor working code unless asked
- NEVER install packages "just in case"
- Build exactly what's asked, nothing more

### 5. Minimize Tool Calls

- Combine multiple shell commands with `&&` when possible
- Use `find` and `grep` instead of reading multiple files to locate something
- Check if a package is already installed before running `npm install`
- Use `cat` with multiple files rather than separate `view` calls when you need quick content

---

## Decision Framework: Before Every Action

Ask yourself these questions BEFORE every tool call:

```
1. Do I already have this information? → Skip the read
2. Can I combine this with the next action? → Batch them
3. Am I rewriting or editing? → Choose the minimal option
4. Is this strictly necessary for the current task? → Skip if not
5. Will this tool call teach me something I don't know? → Skip if no
```

---

## Anti-Patterns to AVOID

### Token-Wasting Patterns

```
BAD:  Read file → Think about it → Read same file again → Edit it
GOOD: Read file → Edit it (reference from memory)

BAD:  Create file with placeholder → Immediately edit to add real content
GOOD: Create file with real content in one pass

BAD:  npm install package1 → npm install package2 → npm install package3
GOOD: npm install package1 package2 package3

BAD:  Read all 15 files in a directory to "understand the project"
GOOD: Read directory listing → Read only the 2-3 files relevant to the task

BAD:  Rewrite entire 300-line file because you changed one function
GOOD: str_replace the specific function that changed

BAD:  Create auth.test.js, scan.test.js, profile.test.js upfront
GOOD: Create test files only when the user asks for tests

BAD:  "Let me verify the file was created correctly" → reads the file back
GOOD: Trust the tool output — only verify if there's a specific concern
```

### Conversation-Wasting Patterns

```
BAD:  "I'll now create the following files: ..." (listing 10 files before creating them)
GOOD: Just create them. Explain what you did after.

BAD:  "Here's what I'm going to do: Step 1... Step 2... Step 3..." (long plan before simple tasks)
GOOD: For simple tasks, just do them. Plan only for complex multi-step work.

BAD:  Asking for confirmation before every file creation
GOOD: Create files confidently. Ask only when there's genuine ambiguity.

BAD:  Lengthy explanations after every change
GOOD: Brief summary — "Created auth routes with 8 endpoints. Ready to test."
```

---

## Efficient Patterns to USE

### Project Exploration

```
EFFICIENT:
1. ls the root directory (1 call)
2. Read package.json for dependencies (1 call)
3. Read the specific file for the current task (1 call)
Total: 3 calls

WASTEFUL:
1. ls root
2. ls src/
3. ls src/routes/
4. ls src/controllers/
5. Read package.json
6. Read .env.example
7. Read README.md
8. Read the file you actually need
Total: 8 calls — 5 were unnecessary
```

### Multi-File Feature Creation

```
EFFICIENT:
1. Plan all files mentally
2. Create model file
3. Create service file (references model)
4. Create controller file (references service)
5. Create route file (references controller)
6. Update app.js to mount route
Total: 5 creates + 1 edit = 6 calls

WASTEFUL:
1. Create model file
2. Read model file to verify
3. Create service file
4. Read service file to verify
5. Realize you forgot an import in service
6. Edit service file
7. Create controller
... (you get the pattern)
Total: 12+ calls for the same result
```

### Bug Fixing

```
EFFICIENT:
1. Read the error message carefully
2. Read the specific file mentioned in the error (1 call)
3. Fix the issue with targeted edit (1 call)
Total: 2 calls

WASTEFUL:
1. Read the error
2. Read 4 related files "to understand context"
3. Read the config file "just in case"
4. Fix the issue
Total: 6 calls — 4 were unnecessary
```

---

## Git Workflow Efficiency

```
EFFICIENT:
# Stage and commit in one go
git add -A && git commit -m "feat(auth): implement login endpoint"

WASTEFUL:
git status          # unnecessary if you just created the files
git add file1.js
git add file2.js
git add file3.js    # use -A or . instead
git diff --staged   # unnecessary verification
git commit -m "..."
```

---

## Response Efficiency

When reporting what you did:

```
EFFICIENT:
"Created the auth module with signup, login, verify-otp, refresh, and logout endpoints.
Files: auth.routes.js, auth.controller.js, auth.service.js, auth.validator.js
All endpoints use the standardized response format. Ready for testing."

WASTEFUL:
"I've created the authentication module. Let me walk you through each file:

First, I created auth.routes.js which contains the following routes:
- POST /signup - This route handles...
- POST /login - This route handles...
[... 50 lines of explanation for straightforward code ...]

Next, I created auth.controller.js which contains:
[... another 50 lines ...]"
```

The code speaks for itself. Summarize, don't narrate.

---

## Budget Awareness

For a typical feature module:
- Expect 5-10 tool calls to create
- Expect 2-3 tool calls to fix a bug
- Expect 1-2 tool calls for a simple edit
- If you're exceeding 15 tool calls for a single feature, you're being wasteful

ALWAYS err on the side of fewer, more impactful actions.
