# Puppeteer Recorder

<img src="https://user-images.githubusercontent.com/10379601/29446482-04f7036a-841f-11e7-9872-91d1fc2ea683.png" height="200" align="right">

> :warning: This is still work in progress

> Puppeteer is a Node library which provides a high-level API to control Chrome or Chromium over the [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). Puppeteer runs [headless](https://developers.google.com/web/updates/2017/04/headless-chrome) by default, but can be configured to run full (non-headless) Chrome or Chromium.

This repository allows to record puppeteer scripts by interacting with the browser:

```bash
npx puppeteer-recorder [url]
```

will start a new browser in which every interaction with the page will be recorded and printed to the console as 
a script runnable via puppeteer.

```js
const {open, click, type, submit} = require('@pptr/recorder');
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

## Architecture

This project consists of three parts:
- __Recorder__: Cli script that starts a Chromium instance to record user interactions
- __Runner__: Npm package to abstract away the puppeteer details when running recorded interactions
- __Injected Script__: The recorder will automatically inject a script into the browser to collect information about interactions and to relay them to the recorder

## Setup

When checking out the repository locally, you can use 

```bash
npm run build
```

to compile the _injected script_, the _recorder_ and the _runner_.
By running `npm link`, the package will become available to be run via `npx`.
When running the recorded scripts, make sure the package is available in their node_modules folder by using `npm link @pptr/recorder`.

## Debugging

Use the runner with `DEBUG=1` to execute the script line by line.

## Known limitations

There are a number of known limitations:
- It's currently not possible to record interactions inside of [shadow doms](https://github.com/puppeteer/recorder/issues/4)
- It only records clicks, changes to text fields and form submits for now
