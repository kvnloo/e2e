# @e2e-dev/e2b

## 0.0.4

### Patch Changes

- [#2304](https://github.com/e2e-inc/e2e/pull/2304) [`342e95a`](https://github.com/e2e-inc/e2e/commit/342e95abebc188d7ee553b16643c9dac5cdcae50) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `agent-device`, `@agent-device/revyl`, and `@agent-device/testmu` to 0.21.43, `@vitest/expect` to 5.1.2, and `@agentclientprotocol/sdk` to 2.12.0.

## 0.0.3

### Patch Changes

- [#1975](https://github.com/e2e-inc/e2e/pull/1975) [`1676981`](https://github.com/e2e-inc/e2e/commit/1676981ab76fd7a8b7262057a74b320545b0e3bb) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Update agent-device to 0.21.42. On iOS, `device.dismissKeyboard()` no longer presses the keyboard's Hide Keyboard or Done key: an iPad keyboard now goes away by the same short drag as an iPhone one. Pressing Enter sends one Return to the focused input, a fill reaches only the input a tap at that point reaches, and a command on a session whose simulator was deleted fails at once instead of waiting about 20 seconds. A fill on iOS is also a little faster.

## 0.0.2

### Patch Changes

- [#1859](https://github.com/e2e-inc/e2e/pull/1859) [`e65091b`](https://github.com/e2e-inc/e2e/commit/e65091bbe10b00860ec6240336b57933a7ce65f7) Thanks [@kdy1](https://github.com/kdy1)! - Update agent-device to 0.21.38. Opening an app now waits for the app's first screen before the first capture, and on Android a relaunch accepts a package that Android restarts at once. On iOS, `device.back()` presses the navigation bar's back button when there is one, keyboard dismiss and enter have a bounded idle wait, and agent-device establishes the screen origin of a full-screen private accessibility root.

- [#1958](https://github.com/e2e-inc/e2e/pull/1958) [`ad641be`](https://github.com/e2e-inc/e2e/commit/ad641beeaca6ee56a251bdc0abde8053b0b0ee7c) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Update agent-device to 0.21.39. Android taps and key presses no longer wait for global animations, and screenshots on Android and single-panel iOS simulators read rotation without an extra round trip.

## 0.0.1

### Patch Changes

- [#1735](https://github.com/e2e-inc/e2e/pull/1735) [`16ff228`](https://github.com/e2e-inc/e2e/commit/16ff228576b0c5959d96450a626faafd580bdc75) Thanks [@gronxb](https://github.com/gronxb)! - Update agent-device to 0.21.37. Without `device`, the iOS pool no longer picks a paired iPhone that is not connected: agent-device now lists a phone whose CoreDevice tunnel is unavailable as not booted. A `device` that names such a phone fails in `prepare` with "iOS device is not ready for automation", before any test runs, instead of at app launch. A test's own swipe and scroll now skip agent-device's post-gesture wait, which 0.21.36 ignored.

- [#1730](https://github.com/e2e-inc/e2e/pull/1730) [`7e309c1`](https://github.com/e2e-inc/e2e/commit/7e309c151e4d82f7c1e14c139ba77ed0c7993ee9) Thanks [@karolkulesza](https://github.com/karolkulesza)! - The setup guide's link to the `command` reference no longer returns 404. The e2b and HTML reporter READMEs link to e2e.com instead of e2e.tester.army.

- [#1598](https://github.com/e2e-inc/e2e/pull/1598) [`ae5d121`](https://github.com/e2e-inc/e2e/commit/ae5d1215144061939afef46578856dcdd696360e) Thanks [@tomasvarga](https://github.com/tomasvarga)! - New package: `e2b()`, a device provider that runs Android 16 in one E2B sandbox per worker slot and installs the target's `.apk`, and `e2bBrowsers()` from `@e2e-dev/e2b/web`, a browser provider that runs Chromium in E2B sandboxes per worker slot or per attempt.

- [#1672](https://github.com/e2e-inc/e2e/pull/1672) [`3735887`](https://github.com/e2e-inc/e2e/commit/373588756937562aa89c7dd7f7995ac6b16db972) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Move GitHub repository metadata and CLI links to e2e-inc/e2e after the organization rename. Register the MCP server as io.github.e2e-inc/e2e.
