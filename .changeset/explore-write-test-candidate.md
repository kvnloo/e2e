---
"e2e": minor
---

`e2e explore --write-test <path>` can now preserve a passing exploration as a skipped regression-test candidate. Passed charters become `agent.act()` seeds with explicit verification notes; the generated test stays skipped until independent deterministic checks are added, and existing files are never replaced.
