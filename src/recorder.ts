/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as puppeteer from 'puppeteer';
import { Readable } from 'stream';
import { loadAndPatchInjectedModule } from './aria';

interface RecorderOptions {
  wsEndpoint?: string
}

async function getBrowserInstance(options: RecorderOptions) {
  if (options && options.wsEndpoint) {
    return puppeteer.connect({ browserWSEndpoint: options.wsEndpoint });
  } else {
    return puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--enable-blink-features=ComputedAccessibilityInfo',
      ],
    });
  }
}

export default async (url: string, options: RecorderOptions = {}) => {
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const output = new Readable({
    read(size) { },
  });
  output.setEncoding('utf8');
  const browser = await getBrowserInstance(options);
  const page = await browser.pages().then(pages => pages[0]);

  let identation = 0;
  const addLineToPuppeteerScript = (line: string) => {
    const data = '  '.repeat(identation) + line;
    output.push(data + '\n');
  }

  page.exposeFunction('addLineToPuppeteerScript', addLineToPuppeteerScript);
  page.evaluateOnNewDocument(loadAndPatchInjectedModule());

  // Setup puppeteer
  addLineToPuppeteerScript(`const {open, click, type, submit, expect, scrollToBottom} = require('@puppeteer/recorder');`)
  addLineToPuppeteerScript(`open('${url}', {}, async (page) => {`);
  identation += 1;

  // Open the initial page
  await page.goto(url);

  // Add expectations for mainframe navigations
  page.on('framenavigated', (frame: puppeteer.Frame) => {
    if (frame.parentFrame()) return;
    addLineToPuppeteerScript(`expect(page.url()).resolves.toBe('${frame.url()}');`);
  });


  async function close() {
    identation -= 1;
    addLineToPuppeteerScript(`});`);
    output.push(null);

    // In case we started the browser instance
    if (!options.wsEndpoint) {
      // Close it
      await browser.close();
    }
  }

  // Finish the puppeteer script when the page is closed
  page.on('close', close);
  // Or if the user stops the script
  process.on('SIGINT', async () => {
    await close();
    process.exit();
  });

  return output;
}
