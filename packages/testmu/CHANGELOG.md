# @e2e-dev/testmu

## 0.0.8

### Patch Changes

- [#2304](https://github.com/e2e-inc/e2e/pull/2304) [`342e95a`](https://github.com/e2e-inc/e2e/commit/342e95abebc188d7ee553b16643c9dac5cdcae50) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `agent-device`, `@agent-device/revyl`, and `@agent-device/testmu` to 0.21.43, `@vitest/expect` to 5.1.2, and `@agentclientprotocol/sdk` to 2.12.0.

- [#2299](https://github.com/e2e-inc/e2e/pull/2299) [`62f97e0`](https://github.com/e2e-inc/e2e/commit/62f97e04bc2c3aaf1d3992bd7dc166a0420e062d) Thanks [@kdy1](https://github.com/kdy1)! - `@e2e-dev/revyl`, `@e2e-dev/testmu`, and `@e2e-dev/limrun` check that their agent-device matches the engine's, and they now pin agent-device 0.21.43, so they need `@e2e-dev/mobile` 0.12.10 or newer, the first release that runs it.

## 0.0.7

### Patch Changes

- [#1975](https://github.com/e2e-inc/e2e/pull/1975) [`1676981`](https://github.com/e2e-inc/e2e/commit/1676981ab76fd7a8b7262057a74b320545b0e3bb) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Update agent-device to 0.21.42. On iOS, `device.dismissKeyboard()` no longer presses the keyboard's Hide Keyboard or Done key: an iPad keyboard now goes away by the same short drag as an iPhone one. Pressing Enter sends one Return to the focused input, a fill reaches only the input a tap at that point reaches, and a command on a session whose simulator was deleted fails at once instead of waiting about 20 seconds. A fill on iOS is also a little faster.

## 0.0.6

### Patch Changes

- [#1859](https://github.com/e2e-inc/e2e/pull/1859) [`e65091b`](https://github.com/e2e-inc/e2e/commit/e65091bbe10b00860ec6240336b57933a7ce65f7) Thanks [@kdy1](https://github.com/kdy1)! - Update agent-device to 0.21.38. Opening an app now waits for the app's first screen before the first capture, and on Android a relaunch accepts a package that Android restarts at once. On iOS, `device.back()` presses the navigation bar's back button when there is one, keyboard dismiss and enter have a bounded idle wait, and agent-device establishes the screen origin of a full-screen private accessibility root.

- [#1958](https://github.com/e2e-inc/e2e/pull/1958) [`ad641be`](https://github.com/e2e-inc/e2e/commit/ad641beeaca6ee56a251bdc0abde8053b0b0ee7c) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Update agent-device to 0.21.39. Android taps and key presses no longer wait for global animations, and screenshots on Android and single-panel iOS simulators read rotation without an extra round trip.

- [#1708](https://github.com/e2e-inc/e2e/pull/1708) [`f659d64`](https://github.com/e2e-inc/e2e/commit/f659d64d80cbb484f539681a6bf72f5047854a99) Thanks [@KayaanT](https://github.com/KayaanT)! - `@e2e-dev/mobile/lease` adds `agentDevicePlugin(entry)`, which checks a provider plugin's version against the engine's agent-device and registers it in a lease daemon's home; `@e2e-dev/testmu` now uses it and needs `@e2e-dev/mobile` 0.12.8 or later. A lease's `device` selector is used to allocate it and no longer goes on the worker's client, since the lease scope already picks the device.

## 0.0.5

### Patch Changes

- [#1735](https://github.com/e2e-inc/e2e/pull/1735) [`16ff228`](https://github.com/e2e-inc/e2e/commit/16ff228576b0c5959d96450a626faafd580bdc75) Thanks [@gronxb](https://github.com/gronxb)! - Update agent-device to 0.21.37. Without `device`, the iOS pool no longer picks a paired iPhone that is not connected: agent-device now lists a phone whose CoreDevice tunnel is unavailable as not booted. A `device` that names such a phone fails in `prepare` with "iOS device is not ready for automation", before any test runs, instead of at app launch. A test's own swipe and scroll now skip agent-device's post-gesture wait, which 0.21.36 ignored.

- [#1672](https://github.com/e2e-inc/e2e/pull/1672) [`3735887`](https://github.com/e2e-inc/e2e/commit/373588756937562aa89c7dd7f7995ac6b16db972) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Move GitHub repository metadata and CLI links to e2e-inc/e2e after the organization rename. Register the MCP server as io.github.e2e-inc/e2e.

- [#1715](https://github.com/e2e-inc/e2e/pull/1715) [`be460ec`](https://github.com/e2e-inc/e2e/commit/be460ecd91f4790884a36127310aab0d33853903) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Redact project tool results and errors before the model or AI trace recorder reads them, and redact and bound skip reasons before reporting. Avoid repeated scanning of malformed stack frames and trailing slashes in provider API endpoints. Keep ACP forwarding errors out of HTTP responses while preserving the cause in the runner's redacted failure output.

## 0.0.4

### Patch Changes

- [#1516](https://github.com/tester-army/e2e/pull/1516) [`0410fc9`](https://github.com/tester-army/e2e/commit/0410fc9c74ffac45d5174b7a3a5b3e6f15fdf32f) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump agent-device to 0.21.36, @agentclientprotocol/sdk to 2.4.0, @vitest/expect to 5.1.0, and oxc to 0.157.0.

## 0.0.3

### Patch Changes

- [#1420](https://github.com/tester-army/e2e/pull/1420) [`512eed7`](https://github.com/tester-army/e2e/commit/512eed789dd1234011c5997b680ab1b90e3f8772) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump agent-device to 0.21.33.

- [#1458](https://github.com/tester-army/e2e/pull/1458) [`450be72`](https://github.com/tester-army/e2e/commit/450be721e46a0bc024d873db85b5a7a6c3692965) Thanks [@kacperkapusciak](https://github.com/kacperkapusciak)! - Update agent-device and @agent-device/testmu to 0.21.35. An unscoped boot picks the newest of several shut-down devices, and on iOS, pressing return with nothing focused keeps the runner session.

- [#1382](https://github.com/tester-army/e2e/pull/1382) [`3a8d6f1`](https://github.com/tester-army/e2e/commit/3a8d6f1b6cdaa4c7975c55bf25f67d2e76143b21) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump agent-device to 0.21.31, zod to 4.6.7, @modelcontextprotocol/server to 2.4.0, and oxc to 0.155.0.

- [#1449](https://github.com/tester-army/e2e/pull/1449) [`abb10cf`](https://github.com/tester-army/e2e/commit/abb10cfe154cd979ccec7747b2c799b4929d4c30) Thanks [@bheemreddy-samsara](https://github.com/bheemreddy-samsara)! - Update agent-device to 0.21.34. Hosted WebDriver fills replace the confirmed focused field instead of appending, and an unsupported active-element lookup refuses before tapping. The pre-tap focus probe no longer reads the previous field's geometry.

- [#1307](https://github.com/tester-army/e2e/pull/1307) [`64432f1`](https://github.com/tester-army/e2e/commit/64432f10891d9772494137b0ba328d8ef440deae) Thanks [@malopezr7](https://github.com/malopezr7)! - A device release now fails the run when agent-device can't confirm it ended the TestMu AI session: a forced daemon stop, a lost shutdown report, or a daemon that exited during the run. Needs `@e2e-dev/mobile` 0.12.5 or later.

## 0.0.2

### Patch Changes

- [#1308](https://github.com/tester-army/e2e/pull/1308) [`07eb481`](https://github.com/tester-army/e2e/commit/07eb4812ffd7226d5a5a1ee1a6ab23076f138f0f) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump agent-device to 0.21.29.

- [#1209](https://github.com/tester-army/e2e/pull/1209) [`ef977f4`](https://github.com/tester-army/e2e/commit/ef977f4856da009cac26d78d2e9bb14e5991ee41) Thanks [@knowbody](https://github.com/knowbody)! - Clarify the allocation error when agent-device does not acknowledge `retainOnClose`. The message explains that closing the engine session could end the TestMu AI lease before the provider releases it.

- [#1200](https://github.com/tester-army/e2e/pull/1200) [`92f8cb0`](https://github.com/tester-army/e2e/commit/92f8cb07bf1b997e144aaa56d421e3d57729ef6b) Thanks [@amankansal-lt](https://github.com/amankansal-lt)! - `testmuBrowsers()` from `@e2e-dev/testmu/web` runs web targets in TestMu AI (formerly LambdaTest) hosted Chrome or Edge, one session per worker slot: `web({ browser: testmuBrowsers() })`. `@e2e-dev/mobile` and `@e2e-dev/web` are optional peers now, so a project installs only the engine it uses.

## 0.0.1

### Patch Changes

- [#772](https://github.com/tester-army/e2e/pull/772) [`88ed717`](https://github.com/tester-army/e2e/commit/88ed71768aa7577e473a2df52ff418d35f5cfe8f) Thanks [@amankansal-lt](https://github.com/amankansal-lt)! - New `@e2e-dev/testmu` package: `mobile({ device: testmu({ device, osVersion, app }) })` runs a mobile target on TestMu AI (formerly LambdaTest) Android emulators, iOS simulators, and real devices, one per worker slot, with `LT_USERNAME` and `LT_ACCESS_KEY` from the run's environment. An attempt that records video links TestMu AI's recording of its session.
