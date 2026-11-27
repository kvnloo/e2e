# @e2e-dev/html-reporter

## 0.0.4

### Patch Changes

- [#2312](https://github.com/e2e-inc/e2e/pull/2312) [`c97f5cf`](https://github.com/e2e-inc/e2e/commit/c97f5cf35be1977d0c60a34eac3a874cb1e17e63) Thanks [@okwasniewski](https://github.com/okwasniewski)! - `test.step(title, fn)` runs a function as one named step and returns what it returns. The trace page, the HTML report, and an MCP test outcome show the title with the calls made inside it nested under it, and steps nest. The list reporter shows the steps of a running test, and keeps a `test.step` in its output when it failed or an agent step ran inside it. A failure summary names the `test.step` the failed call was in. In `report.json` it is a step of kind `step` with the api `test.step`, each step inside it carries its index as `parent`, and step progress carries `identity.parentStepId`; the CTRF report has `parent` in a step's `extra`. [test.step](https://e2e.com/docs/reference/test#test-step)

## 0.0.3

### Patch Changes

- [#2096](https://github.com/e2e-inc/e2e/pull/2096) [`634d060`](https://github.com/e2e-inc/e2e/commit/634d06047c7ad2493a9a54541e9e9ede007f37c6) Thanks [@Wali05](https://github.com/Wali05)! - An embedded report just under 1 MB now reads `1.0 MB` instead of `1024 KB`.

- [#2107](https://github.com/e2e-inc/e2e/pull/2107) [`74904fc`](https://github.com/e2e-inc/e2e/commit/74904fcbfdefc27be8db0fffa73a3af8a92fb6d0) Thanks [@okwasniewski](https://github.com/okwasniewski)! - The HTML report shows names as written instead of lowercasing them. A hook step's tag reads `beforeEach`, not `beforeeach`, and target names, test tags, session names, skip reasons, screen URLs, and token counts (`1.2M`, not `1.2m`) keep their casing too.

- [#1936](https://github.com/e2e-inc/e2e/pull/1936) [`eddf577`](https://github.com/e2e-inc/e2e/commit/eddf5775264134b61ce5ac986370dce2bf75844b) Thanks [@KrzysztofMoch](https://github.com/KrzysztofMoch)! - **Breaking:** without `list`, `dot`, or another interactive reporter, what your code prints goes to stderr where it went to stdout before. So does what the config prints while it loads. Stdout now holds only what a reporter prints there, and beside `json` only the JSON report.
  
  **Deprecated:** the `plan` run event. Read `collected`, which follows it with the same `total` and `files`. `plan` is removed no earlier than April 1, 2027.
  
  The built-in reporters are built on the public `Reporter` contract, so a reporter of your own can do everything they do. Ids such as `'list'` and `'junit'` work as before; to pass options, call the factory from `e2e/reporters`: `list()`, `dot()`, `json()`, `junit({ outputFile })`, and `markdown({ outputFile })`. `--reporter` keeps the options of a built-in the config configured, and `--reporter list,json` works like `dot,json`: `list` prints to stderr beside `json`.
  
  A reporter has one live hook, `onEvent`, and three for the finished run: `reportFiles` returns files the runner writes atomically, `onRunFinished` uploads or notifies, and `onSummary(rows, run)` prints, redacted, such as every reporter's summary rows or a document on stdout. `interactive: true` marks the one reporter that shows the run in the terminal, as `list` and `dot` do; the runner then prints nothing itself.
  
  New in the event stream:
  
  - `collected` lists every test of the run in `tests` before the first one starts, with `repeatEach`.
  - A step's `start` progress has `source`, the test file line that called it.
  - `paused` and `resumed` say when a test waits at a `--step` prompt or `screen.pause()`.
  - `output` events include what the runner process prints, with no `target`.
  
  Every reporter gets the same event object, with its own fields frozen.
  
  `--step` works with the json reporter in a terminal. After a second Ctrl-C, `reportFiles` has 5 seconds left.
  
  `@e2e-dev/html-reporter` writes `report.html` through `reportFiles` and needs `e2e` 0.24.1 or later.

- [#2015](https://github.com/e2e-inc/e2e/pull/2015) [`23aa697`](https://github.com/e2e-inc/e2e/commit/23aa697e2627b9c0ee436ea40128b3ee8f682c1c) Thanks [@satya164](https://github.com/satya164)! - `--step` and `screen.pause()` keys now appear below the live summary, with `s` for the screen and `l` for the app log.
  Time when every running worker is paused is excluded from the terminal's `Duration` row and the report's new `run.durationMs` field.

## 0.0.2

### Patch Changes

- [#1965](https://github.com/e2e-inc/e2e/pull/1965) [`60d29cf`](https://github.com/e2e-inc/e2e/commit/60d29cfe4c9d88b00659e0d0e00b8973d61e7391) Thanks [@szymonrybczak](https://github.com/szymonrybczak)! - List the maintainers' `@e2e.com` addresses in `contributors`.

- [#1829](https://github.com/e2e-inc/e2e/pull/1829) [`3fac999`](https://github.com/e2e-inc/e2e/commit/3fac999c460bc2dfc1268aba9316e3f67ca9ad4f) Thanks [@Wali05](https://github.com/Wali05)! - Durations just under a unit boundary now read `1.0s`, `1m 0s`, or `2m 0s` instead of `1000ms`, `60.0s`, or `1m 60s`.

- [#1915](https://github.com/e2e-inc/e2e/pull/1915) [`243eaa4`](https://github.com/e2e-inc/e2e/commit/243eaa40ec5e60cd46bbe9422026d386cd3325e0) Thanks [@Asheesh7298](https://github.com/Asheesh7298)! - `htmlReporter()` no longer overwrites `report.html` when a run stops before its tests.

- [#1793](https://github.com/e2e-inc/e2e/pull/1793) [`f5cda16`](https://github.com/e2e-inc/e2e/commit/f5cda163137b298bfef82bd25281d7e872d47f46) Thanks [@DeryFerd](https://github.com/DeryFerd)! - Filter a run's results by target in the HTML report: on a multi-target run target tabs sit above the status tabs, and the counts, the test tree, and the header follow the selected target.

- [#1935](https://github.com/e2e-inc/e2e/pull/1935) [`9d240ac`](https://github.com/e2e-inc/e2e/commit/9d240ac954f65804fece214bfbf112966364d644) Thanks [@okwasniewski](https://github.com/okwasniewski)! - A session a test opens with `launch()` is now in the test's report: its steps under `launch-1`, `launch-2`, in the order they ran, its model usage counted with the test's, and its video kept beside the test's when the test records one. Steps and video artifacts carry an `actor`, and so does `progress.identity` for reporters. The test owns what it opened: a host or session it leaves open is closed when the test ends, a step it leaves running fails the test with `STEP_NOT_AWAITED`, and a timeout cuts a session's step as it cuts the test's own. The trace page, the HTML report, and the Markdown and JUnit failure text name the session, and the HTML report plays each step in its own session's video. While such a session records for the test, `app.startRecording()` on it fails with `UNSUPPORTED_CAPABILITY`, as it does on the test's own session.

- [#1851](https://github.com/e2e-inc/e2e/pull/1851) [`9034956`](https://github.com/e2e-inc/e2e/commit/9034956b204e57be2ef982148c02d1d573ec495d) Thanks [@Wali05](https://github.com/Wali05)! - Token counts just under a million now read `1.0M` instead of `1000.0k`, and the HTML report shows millions as `2.5M` instead of `2500.0k`.

## 0.0.1

### Patch Changes

- [#1730](https://github.com/e2e-inc/e2e/pull/1730) [`7e309c1`](https://github.com/e2e-inc/e2e/commit/7e309c151e4d82f7c1e14c139ba77ed0c7993ee9) Thanks [@karolkulesza](https://github.com/karolkulesza)! - The setup guide's link to the `command` reference no longer returns 404. The e2b and HTML reporter READMEs link to e2e.com instead of e2e.tester.army.

- [#1672](https://github.com/e2e-inc/e2e/pull/1672) [`3735887`](https://github.com/e2e-inc/e2e/commit/373588756937562aa89c7dd7f7995ac6b16db972) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Move GitHub repository metadata and CLI links to e2e-inc/e2e after the organization rename. Register the MCP server as io.github.e2e-inc/e2e.

- [#1642](https://github.com/e2e-inc/e2e/pull/1642) [`a133807`](https://github.com/e2e-inc/e2e/commit/a13380728fc0822f1da477fdec0da10632c84cc0) Thanks [@KrzysztofMoch](https://github.com/KrzysztofMoch)! - New package: `htmlReporter()` writes the run as one HTML page, `.e2e/report.html`, that opens from disk with no server. It lists the tests by file with status tabs and search, and shows each test's attempts, error, steps, screenshots, and video, with each step linked to its moment in the video. Agent steps show their explanation, the actions they took, the model, tokens and cost, and whether the step replayed from the cache. A failed assertion that reports expected and received values shows them with the difference marked. When the test file is in the project, the failure shows the code around the failing call, and each step opens to its code. **copy prompt** on a failed test copies its failure, steps, and file paths for a coding agent. The page has a light and a dark theme, following the system's by default. `media: 'embed'` puts screenshots and videos in the page so the one file is the whole report, and `media: 'none'` leaves them out.
