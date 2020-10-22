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
import { cssPath } from './helpers';

let client: puppeteer.CDPSession;
let paused: Promise<void>;

interface RecorderOptions {
  wsEndpoint?: string;
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

export async function getSelector(objectId: string) {
  const ariaSelector = await getAriaSelector(objectId);
  if (ariaSelector) return ariaSelector;
  // @ts-ignore
  const { result } = await client.send('Runtime.callFunctionOn', {
    functionDeclaration: cssPath.toString(),
    objectId,
  });
  return result.value;
}

export async function getAriaSelector(
  objectId: string
): Promise<string | null> {
  // @ts-ignore
  const { nodes } = await client
    .send('Accessibility.queryAXTree', {
      objectId,
    })
    .catch((error) => console.log(error.message));
  if (nodes.length === 0) return null;
  const axNode = nodes[0];
  const name = axNode.name.value;
  const role = axNode.role.value;
  if (name) {
    return `aria/${name}[role="${role}"]`;
  }
  return null;
}

export default async (url: string, options: RecorderOptions = {}) => {
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const output = new Readable({
    read(size) {},
  });
  output.setEncoding('utf8');
  const browser = await getBrowserInstance(options);
  const page = await browser.pages().then((pages) => pages[0]);
  // @ts-ignore
  client = page._client;
  await client.send('Debugger.enable', {});
  await client.send('DOMDebugger.setEventListenerBreakpoint', {
    eventName: 'click',
  });
  await client.send('DOMDebugger.setEventListenerBreakpoint', {
    eventName: 'change',
  });
  await client.send('DOMDebugger.setEventListenerBreakpoint', {
    eventName: 'submit',
  });

  const resume = async () => {
    await client.send('Debugger.setSkipAllPauses', { skip: true });
    await client.send('Debugger.resume', { terminateOnResume: false });
    await client.send('Debugger.setSkipAllPauses', { skip: false });
  };

  const handleClickEvent = async (localFrame) => {
    // @ts-ignore
    const pointerEvent = localFrame.find(
      (prop) =>
        prop.value.className === 'PointerEvent' ||
        prop.value.className === 'MouseEvent'
    );
    const pointerEventProps = await client.send('Runtime.getProperties', {
      objectId: pointerEvent.value.objectId,
    });
    // @ts-ignore
    const target = pointerEventProps.result.find(
      (prop) => prop.name === 'target'
    );
    const selector = await getSelector(target.value.objectId);
    if (selector) {
      addLineToPuppeteerScript(`await click('${selector}');`);
    } else {
      console.log(`failed to generate selector`);
    }
  };

  const handleChangeEvent = async (localFrame) => {
    // @ts-ignore
    const changeEvent = localFrame.find(
      (prop) => prop.value.className === 'Event'
    );
    const changeEventProps = await client.send('Runtime.getProperties', {
      objectId: changeEvent.value.objectId,
    });
    // @ts-ignore
    const target = changeEventProps.result.find(
      (prop) => prop.name === 'target'
    );
    const targetValue = await client.send('Runtime.callFunctionOn', {
      functionDeclaration: 'function() { return this.value }',
      objectId: target.value.objectId,
    });
    // @ts-ignore
    const value = targetValue.result.value;
    const escapedValue = value.replace(/'/g, "\\'");
    const selector = await getAriaSelector(target.value.objectId);
    addLineToPuppeteerScript(`await type('${selector}', '${escapedValue}');`);
  };

  client.on('Debugger.paused', async function (params) {
    paused = this;
    const event = params.data.eventName;
    const localFrame = params.callFrames[0].scopeChain[0];
    // @ts-ignore
    const { result } = await client.send('Runtime.getProperties', {
      objectId: localFrame.object.objectId,
    });
    if (event === 'listener:click') {
      await handleClickEvent(result);
    } else if (event === 'listener:change') {
      await handleChangeEvent(result);
    }
    await resume();
  });

  let identation = 0;
  const addLineToPuppeteerScript = (line: string) => {
    const data = '  '.repeat(identation) + line;
    output.push(data + '\n');
  };

  page.evaluateOnNewDocument(() => {
    window.addEventListener('change', async (e) => {}, true);
    window.addEventListener('click', async (e) => {}, true);
  });

  // Setup puppeteer
  addLineToPuppeteerScript(
    `const {open, click, type, submit, expect, scrollToBottom} = require('@puppeteer/recorder');`
  );
  addLineToPuppeteerScript(`open('${url}', {}, async (page) => {`);
  identation += 1;

  // Open the initial page
  await page.goto(url);

  // Add expectations for mainframe navigations
  page.on('framenavigated', async (frame: puppeteer.Frame) => {
    if (frame.parentFrame()) return;
    await paused;
    addLineToPuppeteerScript(
      `expect(page.url()).resolves.toBe('${frame.url()}');`
    );
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
};
