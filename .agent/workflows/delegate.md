# Hierarchical Task Delegation Workflow

This workflow standardizes how the agent receives prompts, analyzes them from an executive perspective, breaks them into executable sub-tasks, and explicitly switches roles to implement them.

## 1. Executive Analysis (CEO/CTO)

When receiving a new feature request or complex query:

**CEO (Chief Executive Officer):**
- Evaluate the business logic, product impact, and legal constraints.
- Will this feature affect user privacy? Delegate to **Legal Counsel**.
- How should this be messaged or shaped for the user? Delegate to **Product Manager** or **Marketing Manager**.

**CTO (Chief Technology Officer):**
- Review the CEO's functional requirements and design the technical architecture.
- Identify data structures, API contracts, and UI components needed.

## 2. Delegation Plan Formulation

Draft a plan explicitly listing which sub-agents are needed for the specific task.

```markdown
### Delegation Plan
- **Frontend Developer**: Implement XYZ component.
- **Backend Developer**: Create XYZ endpoint.
- **Test Engineer**: Add coverage for XYZ.
```

## 3. Explicit Role Switching (Execution)

As you execute the plan, you MUST explicitly announce your role switch to the user using the exact naming in `ROLES.md`.

Format:
`Switching to [Role Name]:`

> **Note:** The agent naturally assumes the persona and context of this specialized role while performing the tasks, keeping discussions focused and scoped to that discipline.

### Example Sequence
1. `Switching to Data Engineer:` 
   *Performs database schema updates.*
2. `Switching to Backend Developer:` 
   *Implements the API endpoint for the new schema.*
3. `Switching to Frontend Developer:` 
   *Wires the API endpoint up to the user interface.*
4. `Switching to QA Analyst:` 
   *Performs functional testing across the stack.*
