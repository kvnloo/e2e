---
"@e2e-dev/hyprland": minor
"@e2e-dev/sway": patch
"@e2e-dev/tern": patch
---

Contain private Sway/Tern attempts on exact owned Hyprland headless outputs. Assert generated tag, PID/start, visible workspace and geometry, measure declared human-output/focus/cursor boundaries, and clean owned resources after worker death without host input or persistent compositor rules.

Require a real rootless, render-only disposable parent fixture with actual inert human caret/focus/value, chord, pointer/count, PNG and parallel CLI assertions. It exercises real foreign-client cleanup refusal, actual exited-client generation refusal and SIGKILL/SIGTERM/SIGINT recovery. Missing permitted runtime, dmabuf/render or sandbox prerequisites fail closed rather than producing simulated native proof.
