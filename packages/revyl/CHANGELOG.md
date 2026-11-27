# @e2e-dev/revyl

## 0.0.3

### Patch Changes

- [#2304](https://github.com/e2e-inc/e2e/pull/2304) [`342e95a`](https://github.com/e2e-inc/e2e/commit/342e95abebc188d7ee553b16643c9dac5cdcae50) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Bump `agent-device`, `@agent-device/revyl`, and `@agent-device/testmu` to 0.21.43, `@vitest/expect` to 5.1.2, and `@agentclientprotocol/sdk` to 2.12.0.

- [#2299](https://github.com/e2e-inc/e2e/pull/2299) [`62f97e0`](https://github.com/e2e-inc/e2e/commit/62f97e04bc2c3aaf1d3992bd7dc166a0420e062d) Thanks [@kdy1](https://github.com/kdy1)! - `@e2e-dev/revyl`, `@e2e-dev/testmu`, and `@e2e-dev/limrun` check that their agent-device matches the engine's, and they now pin agent-device 0.21.43, so they need `@e2e-dev/mobile` 0.12.10 or newer, the first release that runs it.

## 0.0.2

### Patch Changes

- [#1975](https://github.com/e2e-inc/e2e/pull/1975) [`1676981`](https://github.com/e2e-inc/e2e/commit/1676981ab76fd7a8b7262057a74b320545b0e3bb) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Update agent-device to 0.21.42. On iOS, `device.dismissKeyboard()` no longer presses the keyboard's Hide Keyboard or Done key: an iPad keyboard now goes away by the same short drag as an iPhone one. Pressing Enter sends one Return to the focused input, a fill reaches only the input a tap at that point reaches, and a command on a session whose simulator was deleted fails at once instead of waiting about 20 seconds. A fill on iOS is also a little faster.

- [#1947](https://github.com/e2e-inc/e2e/pull/1947) [`8255089`](https://github.com/e2e-inc/e2e/commit/82550897f47469272d464fa92c3580033442af02) Thanks [@KayaanT](https://github.com/KayaanT)! - Tests a local build on Revyl: with `app` left out of `revyl()`, each device starts with no app and the target's `app.appPath` is uploaded to it and installed there.

## 0.0.1

### Patch Changes

- [#1958](https://github.com/e2e-inc/e2e/pull/1958) [`ad641be`](https://github.com/e2e-inc/e2e/commit/ad641beeaca6ee56a251bdc0abde8053b0b0ee7c) Thanks [@okwasniewski](https://github.com/okwasniewski)! - Update agent-device to 0.21.39. Android taps and key presses no longer wait for global animations, and screenshots on Android and single-panel iOS simulators read rotation without an extra round trip.

- [#1708](https://github.com/e2e-inc/e2e/pull/1708) [`f659d64`](https://github.com/e2e-inc/e2e/commit/f659d64d80cbb484f539681a6bf72f5047854a99) Thanks [@KayaanT](https://github.com/KayaanT)! - Add `@e2e-dev/revyl`: `revyl({ app, device, osVersion })` runs mobile targets on Revyl's hosted iOS simulators and Android emulators, one device per worker slot, through agent-device's `@agent-device/revyl` plugin. Set `REVYL_API_KEY` in the run environment; Revyl installs the build from the `https` `app` URL. Needs `@e2e-dev/mobile` 0.12.8 or later.
