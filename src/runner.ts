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

import * as fs from 'fs';
import * as timers from 'timers';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

declare const __dirname;

const aria = fs.readFileSync(path.join(__dirname, '../node_modules/aria-api/dist/aria.js'), { encoding: 'utf8' });

const ariaName = new Function('element', 'selector', `
  // Inject the aria library in case it has not been loaded yet
  if(!globalThis.aria) {${aria}}

  const elements = document.getElementsByTagName('*');
  for(const element of elements) {
    if(!element.parentElement) continue;
    if(aria.getName(element) === selector) {
      return element;
    }
  }

  return null;
`);

puppeteer.__experimental_registerCustomQueryHandler('ariaName', ariaName);

const ariaNameContains = new Function('element', 'selector', `
  // Inject the aria library in case it has not been loaded yet
  if(!globalThis.aria) {${aria}}

  const elements = document.getElementsByTagName('*');
  for(const element of elements) {
    if(!element.parentElement) continue;
    if(aria.getName(element).includes(selector)) {
      return element;
    }
  }

  return null;
`);

puppeteer.__experimental_registerCustomQueryHandler('ariaNameContains', ariaNameContains);

const timeout = t => new Promise(cb => timers.setTimeout(cb, t));

let browser, page;
const delay = 100;

export async function open(url, cb) {
  browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const pages = await browser.pages();
  page = pages[0];
  await page.evaluateOnNewDocument(aria);
  await page.goto(url);
  await timeout(1000);
  await cb(page, browser);
  await browser.close();
}

export async function click(selector) {
  await timeout(delay);
  console.log('click', selector);
  const element = await page.waitForSelector(selector);
  await element.click();
}

export async function type(selector, value) {
  await timeout(delay);
  console.log('type', selector, value);
  const element = await page.waitForSelector(selector);
  await element.click({ clickCount: 3 });
  await element.press('Backspace');
  await element.type(value);
}

export async function submit(selector) {
  await timeout(delay);
  console.log('submit', selector);
  await page.$eval(selector, form => form.requestSubmit());
}
