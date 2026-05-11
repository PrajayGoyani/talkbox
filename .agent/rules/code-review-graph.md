## code-review-graph

Persistent incremental knowledge graph for token-efficient, context-aware code reviews. Parses your codebase with Tree-sitter, builds a structural graph, and provides smart impact analysis.

Rules:

- Before proceeding with any task, use `code_review_graph.detect_changes` or `get_impact_radius` to understand the codebase.
- Use `get_review_context` to get source snippets for review — it is more token-efficient than reading raw files.
- Use `get_affected_flows` to find which execution paths are impacted by a change.
- Use `query_graph` to trace callers, callees, imports, tests, and dependencies.
- Use `semantic_search_nodes` to find functions/classes by name or keyword.
- The graph auto-updates on file changes.
