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
import { readFileSync } from 'fs';
import { Writable, Readable } from 'stream';
import * as path from 'path';

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

  let script = readFileSync(path.join(__dirname, '../lib/inject.js'), { encoding: 'utf-8' })
  script = script.replace(`var childNodes = [];`, `var childNodes = Array.from(node.shadowRoot?.childNodes || []).filter(n => !getOwner(n) && !isHidden(n))`);
  // Todo(https://github.com/puppeteer/recorder/issues/15): Check if this is the right approach
  script = script.replace(`'input[type="text"]:not([list])',`, `'input[type="text"]:not([list])',\n'input[type="password"]:not([list])',`);
  page.evaluateOnNewDocument(script);

  // Setup puppeteer
  addLineToPuppeteerScript(`const {open, click, type, submit} = require('@pptr/recorder');`)
  addLineToPuppeteerScript(`open('${url}', {}, async () => {`);
  identation += 1;

  // Open the initial page
  await page.goto(url);

  // Finish the puppeteer script
  page.on('close', async () => {
    identation -= 1;
    addLineToPuppeteerScript(`})`);
    output.push(null);

    // In case we started the browser instance
    if(!options.wsEndpoint) {
      // Close it
      await browser.close();
    }
  });

  return output;
}
