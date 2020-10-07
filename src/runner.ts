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

import * as timers from 'timers';
import * as puppeteer from 'puppeteer';
import * as readline from 'readline';
import * as expect from 'expect';

export { expect };

declare const __dirname;

const timeout = t => new Promise(cb => timers.setTimeout(cb, t));

let browser, page;
let delay = 100;
const debug = process.env.DEBUG;

interface RunnerOptions {
  delay: number;
}

async function beforeStep(...args) {
  console.log(...args);

  if (!debug) {
    await timeout(delay);
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise((resolve) =>
    rl.question('Press enter to execute this step?', (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

export async function open(url, options: RunnerOptions, cb) {
  delay = options.delay || 100;
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page = pages[0];
  await page.goto(url);
  await timeout(1000);
  await cb(page, browser);
  await browser.close();
}

export async function click(selector) {
  await beforeStep('click', selector);
  const element = await page.waitForSelector(selector, { visible: true });
  await element.click();
}

export async function type(selector, value) {
  await beforeStep('type', selector, value);
  const element = await page.waitForSelector(selector, { visible: true });
  await element.click({ clickCount: 3 });
  await element.press('Backspace');
  await element.type(value);
}

export async function submit(selector) {
  await beforeStep('submit', selector);
  await page.$eval(selector, (form) => form.requestSubmit());
}

export async function scrollToBottom() {
  await beforeStep('scrollToBottom');
  await page.evaluate(() => window.scrollBy(0, document.body.scrollHeight));
}
