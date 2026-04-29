<!-- code-review-graph MCP tools -->

# Universal Core Rules

**CRITICAL:** Before proceeding with any task, you MUST dynamically read and adhere to the project's universal guidelines:

- Engineering Principles & Stack: Read `.agent/rules/core.md`
- Hierarchical Delegation & Roles: Read `.agent/rules/ROLES.md`

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool                        | Use when                                               |
| --------------------------- | ------------------------------------------------------ |
| `detect_changes`            | Reviewing code changes — gives risk-scored analysis    |
| `get_review_context`        | Need source snippets for review — token-efficient      |
| `get_impact_radius`         | Understanding blast radius of a change                 |
| `get_affected_flows`        | Finding which execution paths are impacted             |
| `query_graph`               | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes`     | Finding functions/classes by name or keyword           |
| `get_architecture_overview` | Understanding high-level codebase structure            |
| `refactor_tool`             | Planning renames, finding dead code                    |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## Toolchain: Vite Plus (vp)

**IMPORTANT: This project uses the Vite Plus (`vp`) unified toolchain.**
Future agents MUST use these commands for local development and validation:

- **Testing**: `vp test` (e.g., `vp test path/to/file.test.ts`)
- **Formatting**: `vp fmt`
- **Linting**: `bun run check`
- **Dev Server**: `vp dev`

## Import Path Schema

**IMPORTANT: Use aliased paths instead of relative imports (`../`) whenever possible.**

### Backend (`backend/tsconfig.json`)

- `@/*`: `./src/*`
- `@controllers/*`: `./src/controllers/*`
- `@services/*`: `./src/services/*`
- `@models/*`: `./src/models/*`
- `@middlewares/*`: `./src/middlewares/*`
- `@utils/*`: `./src/utils/*`
- `@schemas/*`: `./src/schemas/*`
- `@config/*`: `./src/config/*`
- `@bootstrap/*`: `./src/bootstrap/*`
- `@routes/*`: `./src/routes/*`
- `@jobs/*`: `./src/jobs/*`

### Frontend (`frontend/tsconfig.app.json`)

- `$lib/*`: `./src/lib/*`
- `$components/*`: `./src/lib/components/*`
- `$state/*`: `./src/lib/state/*`
- `$utils/*`: `./src/lib/utils/*`
- `$types/*`: `./src/lib/types/*`
- `$services/*`: `./src/lib/services/*`
- `$assets/*`: `./src/assets/*`
- `@/*`: `./src/*`
