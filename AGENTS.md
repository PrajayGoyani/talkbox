<!-- code-review-graph MCP tools -->

# Universal Core Rules

**CRITICAL:** Before proceeding with any task, you MUST dynamically read and adhere to the project's universal guidelines:

- Engineering Principles & Stack: Read `.agent/rules/core.md`
- Hierarchical Delegation & Roles: Read `.agent/rules/ROLES.md`

## MCP Tools: Knowledge Graphs

**IMPORTANT: This project uses dual knowledge graphs. ALWAYS use the
MCP tools BEFORE using Grep/Glob/Read to explore the codebase.** The
graphs are faster, cheaper (fewer tokens), and provide structural and
semantic context that file scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `code_review_graph.semantic_search_nodes` or `query_graph`
- **Semantic Discovery**: `graphify.query_graph` for conceptual questions
- **Understanding impact**: `code_review_graph.get_impact_radius`
- **Tracing relationships**: `graphify.get_neighbors` or `shortest_path`
- **Code review**: `detect_changes` + `get_review_context`
- **Finding architecture chokepoints**: `graphify.god_nodes` or `code_review_graph.get_bridge_nodes`

Fall back to Grep/Glob/Read **only** when the graphs don't cover what you need.

### Key Tools: code-review-graph

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

### Key Tools: graphify

| Tool            | Use when                                                |
| --------------- | ------------------------------------------------------- |
| `query_graph`   | BFS/DFS search for conceptual/semantic context          |
| `get_neighbors` | Finding direct relations and edge details for a concept |
| `shortest_path` | Understanding how two distant concepts are linked       |
| `god_nodes`     | Identifying core abstractions and most connected nodes  |
| `graph_stats`   | Getting a high-level overview of graph health/size      |
| `get_node`      | Fetching full details for a specific concept or ID      |

### Workflow

1. The graphs auto-update on file changes (via hooks).
2. Use `graphify` for broad discovery and conceptual mapping.
3. Use `code-review-graph` for detailed structural analysis and review.
4. Use `query_graph` pattern="tests_for" to check coverage.

### ⛔ CRITICAL: Graph Build/Update — CLI ONLY

**NEVER use the MCP tool `build_or_update_graph_tool` or `run_postprocess_tool`.**
These MCP tools cause the server to hang indefinitely or crash, corrupting the
database and wasting hours of compute time.

**ALWAYS use the CLI commands instead:**

```bash
# Full rebuild (clean slate):
rm -f .code-review-graph/graph.db .code-review-graph/graph.db-wal .code-review-graph/graph.db-shm
code-review-graph build --skip-postprocess
code-review-graph postprocess

# Incremental update:
code-review-graph update --skip-postprocess
code-review-graph postprocess
```

**Read-only MCP tools are safe** (e.g., `list_graph_stats_tool`, `query_graph_tool`,
`semantic_search_nodes_tool`, `get_architecture_overview_tool`, etc.). Only the
build/update/postprocess MCP tools are banned.

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
- `@repositories/*`: `./src/repositories/*`

### Frontend (`frontend/tsconfig.app.json`)

- `$lib/*`: `./src/lib/*`
- `$components/*`: `./src/lib/components/*`
- `$state/*`: `./src/lib/state/*`
- `$utils/*`: `./src/lib/utils/*`
- `$types/*`: `./src/lib/types/*`
- `$services/*`: `./src/lib/services/*`
- `$assets/*`: `./src/assets/*`
- `@/*`: `./src/*`
