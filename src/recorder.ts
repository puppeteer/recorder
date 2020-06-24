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

export default async (url: string) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  const addLineToPuppeteerScript = (line: string) => {
    console.log('  ' + line);
  }
  page.exposeFunction('addLineToPuppeteerScript', addLineToPuppeteerScript);
  page.evaluateOnNewDocument(async () => {
    class Step {
      public readonly value: string;
      public readonly optimized: boolean;

      constructor(value, optimized) {
        this.value = value;
        this.optimized = optimized;
      }
      toString() {
        return this.value;
      }
    }

    function idSelector(id) {
      return "#" + id;
    }

    function cssPathStep(node, isTargetNode) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return null;
      }
      const id = node.getAttribute("id");
      if (id) {
        return new Step(idSelector(id), true);
      }
      const nodeNameLower = node.nodeName.toLowerCase();
      if (["html", "body", "head"].includes(nodeNameLower)) {
        return new Step(node.nodeName, true);
      }
      const nodeName = node.nodeName;
      const parent = node.parentNode;
      if (!parent || parent.nodeType === Node.DOCUMENT_NODE) {
        return new Step(nodeName, true);
      }
      let needsClassNames = false;
      let needsNthChild = false;
      let ownIndex = -1;
      let elementIndex = -1;
      const siblings = parent.children;
      const ownClassNames = new Set(node.classList);
      for (let i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }
        elementIndex += 1;
        if (sibling === node) {
          ownIndex = elementIndex;
          continue;
        }
        if (sibling.nodeName !== nodeName) {
          continue;
        }
        needsClassNames = true;
        if (!ownClassNames.size) {
          needsNthChild = true;
          continue;
        }
        const siblingClassNames = new Set(sibling.classList);
        for (const siblingClass of siblingClassNames) {
          if (!ownClassNames.has(siblingClass)) {
            continue;
          }
          ownClassNames.delete(siblingClass);
          if (!ownClassNames.size) {
            needsNthChild = true;
            break;
          }
        }
      }
      let result = nodeName;
      if (isTargetNode &&
        nodeName.toLowerCase() === "input" &&
        node.getAttribute("type") &&
        !node.getAttribute("id") &&
        !node.getAttribute("class")) {
        result += `[type="${node.getAttribute("type")}"]`;
      }
      if (needsNthChild) {
        result += `:nth-child(${ownIndex + 1})`;
      }
      else if (needsClassNames) {
        for (const className of ownClassNames) {
          result += "." + className;
        }
      }
      return new Step(result, false);
    }

    function cssPath(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }
      const steps = [];
      let currentNode = node;
      while (currentNode) {
        const step = cssPathStep(currentNode, currentNode === node);
        if (!step) {
          break;
        }
        steps.push(step);
        if (step.optimized) {
          break;
        }
        currentNode = currentNode.parentNode;
      }
      steps.reverse();
      return steps.join(" > ");
    }







    window.addEventListener('click', (e) => {
      const selector = cssPath(e.target);
      addLineToPuppeteerScript(`await page.waitForSelector('${selector}', {visible: true});`);
      addLineToPuppeteerScript(`await page.click('${selector}');`);
    });

    window.addEventListener('change', (e) => {
      const selector = cssPath(e.target);
      const value = (e.target as HTMLInputElement).value;
      addLineToPuppeteerScript(`await page.type('${selector}', '${value}');`);
    });
  });

  // Setup puppeteer
  console.log(`const puppeteer = require('puppeteer');`)
  console.log(`(async () => {`);
  console.log(`  const browser = await puppeteer.launch({headless: false, defaultViewport: null});`);
  console.log(`  const page = await browser.newPage();`);
  console.log(`  await page.goto('${url}');`);

  // Open the initial page
  await page.goto(url);

  // Finish the puppeteer script
  return new Promise(resolve => {
    browser.once('disconnected', () => {
      console.log(`})()`);
      resolve();
    });
  });
}
