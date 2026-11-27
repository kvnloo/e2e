# @e2e-dev/acp

## 0.1.5

### Patch Changes

- [#2304](https://github.com/e2e-inc/e2e/pull/2304) [`342e95a`](https://github.com/e2e-inc/e2e/commit/342e95abebc188d7ee553b16643c9dac5cdcae50) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `agent-device`, `@agent-device/revyl`, and `@agent-device/testmu` to 0.21.43, `@vitest/expect` to 5.1.2, and `@agentclientprotocol/sdk` to 2.12.0.

## 0.1.4

### Patch Changes

- [#2062](https://github.com/e2e-inc/e2e/pull/2062) [`1ece4df`](https://github.com/e2e-inc/e2e/commit/1ece4df43b2fb48ccb04240fc64eeb6189ba72ca) Thanks [@michal-e2e](https://github.com/michal-e2e)! - `codex()` signs Codex in with an OpenAI API key when Codex has no login of its own, so `OPENAI_API_KEY` alone starts the session instead of failing with "the agent is not signed in". It takes the first nonblank of `CODEX_API_KEY` and `OPENAI_API_KEY`, as the Codex adapter does, and leaves a nonblank `DEFAULT_AUTH_REQUEST` you set alone. Codex saves the key as its login, as `codex login --with-api-key` does, unless its credential store is `ephemeral`. While `APP_SERVER_LOGS` is set, `codex()` passes the adapter no sign-in request, yours included, since its log would write the credentials in plain text; a saved login still works. Codex's shell snapshots, which copied the environment with its keys to disk, are off too. When the model provider refuses Codex's credentials at a turn, the step now says how to recover, `codex logout` first for a saved login or key, instead of a bare `Authentication required`.

- [#2185](https://github.com/e2e-inc/e2e/pull/2185) [`2f07acd`](https://github.com/e2e-inc/e2e/commit/2f07acd18851d3591cd81235c18afb50e153b4ab) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `oxc-parser`, `oxc-transform`, and `@oxc-project/runtime` to 0.160.0, and `@agentclientprotocol/sdk` to 2.9.1.

- [#2062](https://github.com/e2e-inc/e2e/pull/2062) [`1ece4df`](https://github.com/e2e-inc/e2e/commit/1ece4df43b2fb48ccb04240fc64eeb6189ba72ca) Thanks [@michal-e2e](https://github.com/michal-e2e)! - Provider keys loaded by a test hook are redacted in subsequent steps, and `codex()` registers the API key in a custom sign-in request it forwards. The report also redacts model names from older cache recordings. A code frame omits its caret when the location falls inside a redacted value.
  
  A model provider or coding agent that quotes your API key back, such as a proxy that puts the rejected key in its error, can no longer put it in the terminal, `report.json`, `summary.md`, or a trace page, and the run no longer sends it to the model in the screen, a tool result, the model's own prose, or a `system` text a config or an executor writes. The run redacts the keys of 20 to 8,192 characters (a value no pattern can be built for is left alone) in `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AI_GATEWAY_API_KEY`, `OPENROUTER_API_KEY`, and the other model provider variables as `<secret:NAME>`, the tokens of a subscription login it sends, and the login `codex()` finds in `CODEX_HOME/auth.json`. `e2e/agent` exports `registerProviderKey`, `registerProviderKeys`, `redactSecrets`, and `redactStepText` for an executor, or a config that passes a key in code. A config that loads a key and then fails quoting it prints its marker too, in `e2e run`, `e2e list`, `e2e doctor`, `e2e cache`, `e2e report`, `e2e init`, and `e2e mcp`, and `list()` and `explore()` from `e2e/runner` now reject as `openHost` does, redacted and without the original `cause`. A key given as a model id is redacted from `e2e doctor`, the run header, `ai-trace.json`, and the model a step records. Errors with code `MODEL_PROVIDER_FAILED`, `CONTEXT_OVERFLOW`, or `MODEL_OUTPUT_INVALID` have their text redacted and omit the raw cause when caught from a step. A provider-key-only scan rewrites whole keys in UTF-8 text downloads up to 16 MiB and leaves their redaction label `incomplete`. A provider key is never added to a session's saved secrets. `e2e run`, `e2e mcp`, and `openHost` now warn when `NODE_DEBUG` names `child_process` or `net`, which make Node print environments and request headers, where only e2e's own output is redacted, for its secrets and these keys, and `acp()` no longer passes `NODE_DEBUG` to the agents it starts. `@e2e-dev/acp` now needs `e2e` 0.25.0 or newer.

## 0.1.3

### Patch Changes

- [#1766](https://github.com/e2e-inc/e2e/pull/1766) [`92bf0a9`](https://github.com/e2e-inc/e2e/commit/92bf0a93f171e72c93990a15641c7cfb2a2c184b) Thanks [@jxnxts](https://github.com/jxnxts)! - A cancelled ACP step now stops right away instead of waiting for the screen read to finish.

- [#1761](https://github.com/e2e-inc/e2e/pull/1761) [`f64e7db`](https://github.com/e2e-inc/e2e/commit/f64e7dba8d617a8804cba96cd8c885658db8aca5) Thanks [@jxnxts](https://github.com/jxnxts)! - A step that times out while the agent is still finishing the previous step's turn now fails with its timeout instead of `MODEL_PROVIDER_FAILED`.

- [#1871](https://github.com/e2e-inc/e2e/pull/1871) [`8af43f5`](https://github.com/e2e-inc/e2e/commit/8af43f5075661ad61bcf36f246e1a269e8c1bb17) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `@agentclientprotocol/sdk` to 2.7.0, and oxc-parser, oxc-transform, `@oxc-project/runtime` to 0.159.0.

- [#1958](https://github.com/e2e-inc/e2e/pull/1958) [`ad641be`](https://github.com/e2e-inc/e2e/commit/ad641beeaca6ee56a251bdc0abde8053b0b0ee7c) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `@ai-sdk/provider` to 4.0.39, `@vitest/expect` to 5.1.1, and `@agentclientprotocol/sdk` to 2.8.0.

## 0.1.2

### Patch Changes

- [#1626](https://github.com/e2e-inc/e2e/pull/1626) [`c9783a0`](https://github.com/e2e-inc/e2e/commit/c9783a0666ffea9af4d156d1154657fb94b4af1b) Thanks [@Varshith-Kali](https://github.com/Varshith-Kali)! - Fix `WORKER_CRASH (EPERM)` on Windows when an ACP session ends: a failed session directory removal no longer crashes the worker and is retried after the agent exits.

- [#1568](https://github.com/e2e-inc/e2e/pull/1568) [`1144df4`](https://github.com/e2e-inc/e2e/commit/1144df4e710a448f0553a9cc8def1fd98aaed3ee) Thanks [@bheemreddy-samsara](https://github.com/bheemreddy-samsara)! - Add opt-in scrolling exploration to agent.assert with bounded action and model-call budgets. Enforce read-only assertion tools for built-in and custom executors. ACP assertions now deny hover; mutating actions from custom executors fail with POLICY_DENIED during any assertion. `createVerdictTool(kind)` drops ASSERTION_INCONCLUSIVE from an act verdict, and `createToolLoopExecutor({ inconclusiveOnOverflow: true })` fails a context overflow as ASSERTION_INCONCLUSIVE instead of shortening the history.

- [#1666](https://github.com/e2e-inc/e2e/pull/1666) [`795f71f`](https://github.com/e2e-inc/e2e/commit/795f71f2ffa6d2d6d38d0de512ce6862b5f6c7dd) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump runtime dependencies: `@clack/prompts` 1.9.0, `oxc-parser`, `oxc-transform`, and `@oxc-project/runtime` 0.158.0, `@ai-sdk/provider` 4.0.37, and `@agentclientprotocol/sdk` 2.5.0 (ACP schema v1.30.0).

- [#1712](https://github.com/e2e-inc/e2e/pull/1712) [`97093eb`](https://github.com/e2e-inc/e2e/commit/97093ebed44e5a785395b46cc48dcfda6e2b6a46) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `@agentclientprotocol/sdk` to 2.6.0.

- [#1672](https://github.com/e2e-inc/e2e/pull/1672) [`3735887`](https://github.com/e2e-inc/e2e/commit/373588756937562aa89c7dd7f7995ac6b16db972) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Move GitHub repository metadata and CLI links to e2e-inc/e2e after the organization rename. Register the MCP server as io.github.e2e-inc/e2e.

- [#1715](https://github.com/e2e-inc/e2e/pull/1715) [`be460ec`](https://github.com/e2e-inc/e2e/commit/be460ecd91f4790884a36127310aab0d33853903) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Redact project tool results and errors before the model or AI trace recorder reads them, and redact and bound skip reasons before reporting. Avoid repeated scanning of malformed stack frames and trailing slashes in provider API endpoints. Keep ACP forwarding errors out of HTTP responses while preserving the cause in the runner's redacted failure output.

## 0.1.1

### Patch Changes

- [#1491](https://github.com/tester-army/e2e/pull/1491) [`108bc60`](https://github.com/tester-army/e2e/commit/108bc604cdcfcfacc8ab66bd179c408bf6887ccf) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump @agentclientprotocol/sdk to 2.2.0, @ai-sdk/provider to 4.0.35, and oxc to 0.156.0.

- [#1516](https://github.com/tester-army/e2e/pull/1516) [`0410fc9`](https://github.com/tester-army/e2e/commit/0410fc9c74ffac45d5174b7a3a5b3e6f15fdf32f) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump agent-device to 0.21.36, @agentclientprotocol/sdk to 2.4.0, @vitest/expect to 5.1.0, and oxc to 0.157.0.

- [#1576](https://github.com/tester-army/e2e/pull/1576) [`33a1541`](https://github.com/tester-army/e2e/commit/33a154157975bb38a421a912052e4d0e436067c8) Thanks [@kdy1](https://github.com/kdy1)! - Start faster by loading heavy dependencies when a command or session needs them. The CLI no longer loads the MCP server, the prompt library, or the schema library until `mcp`, `init`, `login`, `logout`, `models`, `explore`, `upgrade`, `doctor`, or `--watch` runs, so `e2e --version` and `--help` take about 25% less time. `@e2e-dev/web` imports Playwright when a browser is first launched or looked up, so a process that only reads the config skips it: `e2e list` on a web project takes about 44% less time, and importing the package half as long. A worker loads Playwright for its first browser instead of before its first test, so that test's reported duration grows by about 0.14 s while the run takes no longer. `e2e/runner` no longer loads the explorer when imported. `@e2e-dev/acp` loads the ACP and MCP SDKs when its first session starts, and `@e2e-dev/limrun` loads `@limrun/api` when its first device is leased.

## 0.1.0

### Minor Changes

- [#960](https://github.com/tester-army/e2e/pull/960) [`ffed34e`](https://github.com/tester-army/e2e/commit/ffed34e94b9b75867d4526f2b1b92e7a66764c3f) Thanks [@enekesabel](https://github.com/enekesabel)! - **Release:** New package: run `agent.act` and `agent.assert` on your own coding agent over the Agent Client Protocol, signed in with the agent's own login. `claudeCode()` and `codex()` start those agents with e2e's step tools as their only tools; `acp({ command, args })` starts any other ACP agent. Every action goes through the runner, so steps replay from the cache without the agent, and a tool of the agent's own that runs without asking fails the step with `POLICY_DENIED`.

### Patch Changes

- [#1457](https://github.com/tester-army/e2e/pull/1457) [`e3195e3`](https://github.com/tester-army/e2e/commit/e3195e3f79cf7dd845a8ea05bbafa9b30d883c7a) Thanks [@samanyudas](https://github.com/samanyudas)! - A step that starts right after a step that timed out now gets a fresh agent when the old agent runs a tool of its own as it stops. Before, the step failed with `MODEL_PROVIDER_FAILED` ("ACP connection closed"), because it reused the session that tool had closed.
