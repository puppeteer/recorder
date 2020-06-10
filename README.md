# Puppeteer Recorder

<img src="https://user-images.githubusercontent.com/10379601/29446482-04f7036a-841f-11e7-9872-91d1fc2ea683.png" height="200" align="right">

> :warning: This is still work in progress

> Puppeteer is a Node library which provides a high-level API to control Chrome or Chromium over the [DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/). Puppeteer runs [headless](https://developers.google.com/web/updates/2017/04/headless-chrome) by default, but can be configured to run full (non-headless) Chrome or Chromium.

This repository allows to record puppeteer scripts by interacting with the browser:

```bash
npx puppeteer-recorder [url]
```

will start a new browser in which every interaction with the page will be recorded and printed to the console as 
a puppeteer script.
