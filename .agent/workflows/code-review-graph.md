# Workflow: code-review-graph

**Command:** /code-review
**Description:** Structural code review and impact analysis

## Steps

1. Use `detect_changes` to identify modified functions and risk scores.
2. Use `get_review_context` to fetch source snippets for the review.
3. Analyze `get_impact_radius` to understand the blast radius of the changes.
4. Use `query_graph` to verify test coverage and dependency integrity.
