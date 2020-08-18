# Puppeteer Recorder [![npm @puppeteer/recorder package](https://img.shields.io/npm/v/@puppeteer/recorder)](https://www.npmjs.com/package/@puppeteer/recorder)

<img src="https://user-images.githubusercontent.com/10379601/29446482-04f7036a-841f-11e7-9872-91d1fc2ea683.png" height="200" align="right">

> :warning: This is still work in progress

> Puppeteer is a Node.js library which provides a high-level API to control Chrome or Chromium over the [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). Puppeteer runs [headless](https://developers.google.com/web/updates/2017/04/headless-chrome) by default, but can be configured to run full (non-headless) Chrome or Chromium.

This repository allows recording Puppeteer scripts by interacting with the browser:

```bash
npx @puppeteer/recorder [url]
```

will start a new browser in which every interaction with the page will be recorded and printed to the console as
a script runnable via puppeteer. __For now, this will download Chromium every time again. This has to be addressed on the puppeteer side. For a workaround, follow the steps from _Setup_ below.__

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

- Pass `--output file.js` to have the script written to a file

## Architecture

This project consists of three parts:
- __Recorder__: Cli script that starts a Chromium instance to record user interactions
- __Runner__: Npm package to abstract away the puppeteer details when running recorded interactions
- __Injected Script__: The recorder will automatically inject a script into the browser to collect information about interactions and to relay them to the recorder

### Selectors

The usual way of identifying elements within a website is to use a CSS selector. But more and more websites use
some kind of automatically generated class names that do not carry any semantic value anymore and a prone to changes.
To reduce the brittleness of scripts generated with this tool, we decided to pioneer querying the ARIA model instead.
So instead of
```
#tsf > div:nth-child(2) > div.A8SBwf > div.RNNXgb > div > div.a4bIc > input
```
the same element can also be identified by
```
combobox[name="Search"]
```

## Setup

When checking out the repository locally, you can use

```bash
npm run build
```

to compile the _injected script_, the _recorder_ and the _runner_.
By running `npm link`, the package will become available to be run via `npx`.
When running the recorded scripts, make sure the package is available in their `node_modules` folder by using `npm link @puppeteer/recorder`.

## Debugging

Use the runner with `DEBUG=1` to execute the script line by line.

## Known limitations

There are a number of known limitations:
- ~~It's currently not possible to record interactions inside of [shadow doms](https://github.com/puppeteer/recorder/issues/4)~~
- It only records clicks, changes to text fields and form submits for now
- It does not handle [Out-of-Process iframes](https://www.chromium.org/developers/design-documents/oop-iframes) ([See Bug](https://github.com/puppeteer/recorder/issues/20))

