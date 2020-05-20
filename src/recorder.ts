#!/usr/bin/env node

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
import {
  DOMModel,
  cssPath,
} from './dom';

export default async (url: string) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: '/usr/local/google/home/janscheffler/dev/chromium/src/out/Default/chrome',
  });

  const model = new DOMModel();
  const page = await browser.newPage();
  const session = await page.target().createCDPSession();
  session.on('DOM.setChildNodes', (e) => {
    model.setChildNodes(e);
  });

  session.on('DOM.documentUpdated', async (e) => {
    const document = await session.send('DOM.getDocument');
    model.load(document);
  });

  // Setup puppeteer
  console.log(`const puppeteer = require('puppeteer');`)
  console.log(`(async () => {`);
  console.log(`  const browser = await puppeteer.launch({headless: false, defaultViewport: null});`);
  console.log(`  const page = await browser.newPage();`);
  console.log(`  await page.goto('${url}');`);

  // Open the initial page
  await page.goto(url);

  // Get the initial document and initialse the model
  await session.send('DOM.enable');
  const document = await session.send('DOM.getDocument');
  model.load(document);

  // Queue for events to allow processing them in order
  const events = [];

  async function handleEvent() {
    const e = events.shift();
    const node = model.get(e.nodeId);
    if (!node) return;
    const selector = cssPath(node);
    if (!selector) return;

    if (e.name === 'change') {
      try {
        const value = await page.evaluate(selector => document.querySelector(selector).value, selector);
        console.log(`  await page.type('${selector}', '${value}');`);
      } catch (e) { }
    } else if (e.name === 'click') {
      console.log(`  await page.waitForSelector('${selector}', {visible: true});`);
      console.log(`  await page.click('${selector}');`);
    }

    if (events.length) {
      handleEvent();
    }
  }

  // Enqueue every DOM event for processing
  session.on('DOM.DOMEvent', async (e) => {
    events.push(e);
    if (events.length === 1) {
      handleEvent();
    }
  });

  // Finish the puppeteer script
  return new Promise(resolve => {
    browser.on('disconnected', () => {
      console.log(`})()`);
      resolve();
    });
  });
}
