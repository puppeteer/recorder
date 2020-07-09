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
import * as path from 'path';

export default async (url: string) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.pages().then(pages => pages[0]);

  let identation = 0;
  const addLineToPuppeteerScript = (line: string) => {
    const data = '  '.repeat(identation) + line;
    console.log(data);
  }

  page.exposeFunction('addLineToPuppeteerScript', addLineToPuppeteerScript);
  page.evaluateOnNewDocument(readFileSync(path.join(__dirname, '../lib/inject.js'), { encoding: 'utf-8' }));

  // Setup puppeteer
  addLineToPuppeteerScript(`const {open, click, type, submit} = require('@pptr/recorder');`)
  addLineToPuppeteerScript(`open('${url}', {}, async () => {`);
  identation += 1;

  // Open the initial page
  await page.goto(url);

  // Finish the puppeteer script
  return new Promise(resolve => {
    browser.once('disconnected', () => {
      identation -= 1;
      addLineToPuppeteerScript(`})`);
      resolve();
    });
  });
}
