# Puppeteer Recorder [![npm @puppeteer/recorder package](https://img.shields.io/npm/v/@puppeteer/recorder)](https://www.npmjs.com/package/@puppeteer/recorder)

<img src="https://user-images.githubusercontent.com/10379601/29446482-04f7036a-841f-11e7-9872-91d1fc2ea683.png" height="200" align="right">

> :warning: This is still work in progress

> Puppeteer is a Node.js library which provides a high-level API to control Chrome or Chromium over the [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/).

This repository allows you to record Puppeteer scripts by interacting with the browser.

To start a new recording:

```bash
npx @puppeteer/recorder [url]
```

Every interaction with the page will be recorded and printed to the console as a script, which you can run with puppeteer.
__For now, this will download Chromium every time again. This has to be addressed on the puppeteer side. As a workaround, build this package locally (see [Setup](#setup)).__

```js
const {open, click, type, submit} = require('@puppeteer/recorder');
open('https://www.google.com/?hl=en', async () => {
  await click('ariaName/Search');
  await type('ariaName/Search', 'calculator');
  await click('ariaName/Google Search');
  await click('ariaName/1');
  await click('ariaName/plus');
  await click('ariaName/2');
  await click('ariaName/equals');
});
```

## Command line options

- Pass `--output file.js` to write the output script to a file

## Architecture

This project consists of three parts:
- __Recorder__: A CLI script that starts a Chromium instance to record user interactions
- __Runner__: An NPM package to abstract away the puppeteer details when running a recording
- __Injected Script__: The recorder injects this script into the browser to collect user interactions

### Selectors

The usual way of identifying elements within a website is to use a CSS selector. But a lot of websites use
automatically generated class names that do not carry any semantic value, and change frequently.
To increase the reliability of scripts generated with this tool, we query using the ARIA model.
Instead of
```
#tsf > div:nth-child(2) > div.A8SBwf > div.RNNXgb > div > div.a4bIc > input
```
the same element can also be identified by
```
combobox[name="Search"]
```

## Setup

You can also check out this repository locally.
To compile the _injected script_, the _recorder_ and the _runner_:

```bash
npm install
npm run build
```

To make the package available to run via `npx`:
```bash
npm link
```

To run the package via `npx`:
```bash
npx recorder [url]
```

When running a recorded script, make sure this package is available in the local `node_modules` folder:

```bash
npm link @puppeteer/recorder
```

## Debugging

Use the runner with `DEBUG=1` to execute the script line by line.

## For maintainers

### How to publish new releases to npm

1. On the `main` branch, bump the version number in `package.json`:

    ```sh
    npm version patch -m 'Release v%s'
    ```

    Instead of `patch`, use `minor` or `major` [as needed](https://semver.org/).

    Note that this produces a Git commit + tag.

1. Push the release commit and tag:

    ```sh
    git push               # push the commit
    git push origin v0.1.2 # push the tag
    ```

    Our CI then automatically publishes the new release to npm.

## Known limitations

There are a number of known limitations:
- ~~It's currently not possible to record interactions inside of [shadow doms](https://github.com/puppeteer/recorder/issues/4)~~
- It only records clicks, changes to text fields and form submits for now
- It does not handle [Out-of-Process iframes](https://www.chromium.org/developers/design-documents/oop-iframes) ([See Bug](https://github.com/puppeteer/recorder/issues/20))

