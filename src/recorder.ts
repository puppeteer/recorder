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
import * as helpers from './helpers';
import * as protocol from 'devtools-protocol';
import { ProtocolMapping } from 'devtools-protocol/types/protocol-mapping.js';

declare module 'puppeteer' {
  interface ElementHandle {
    _remoteObject: { objectId: string };
  }
  interface Page {
    _client: puppeteer.CDPSession;
  }
  interface CDPSession {
    send<T extends keyof ProtocolMapping.Commands>(
      method: T,
      ...paramArgs: ProtocolMapping.Commands[T]['paramsType']
    ): Promise<ProtocolMapping.Commands[T]['returnType']>;
  }
}

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

export async function isSubmitButton(
  client: puppeteer.CDPSession,
  objectId: string
): Promise<boolean> {
  const isSubmitButtonResponse = await client.send('Runtime.callFunctionOn', {
    functionDeclaration: helpers.isSubmitButton.toString(),
    objectId,
  });
  return isSubmitButtonResponse.result.value;
}

export async function getSelector(
  client: puppeteer.CDPSession,
  objectId: string
): Promise<string | null> {
  const { nodes } = await client.send('Accessibility.queryAXTree', {
    objectId,
  });
  if (nodes.length === 0) return null;
  const axNode = nodes[0];
  const name = axNode.name.value;
  const role = axNode.role.value;
  if (name) {
    return `aria/${name}[role="${role}"]`;
  }
  const { result } = await client.send('Runtime.callFunctionOn', {
    functionDeclaration: helpers.cssPath.toString(),
    objectId,
  });
  return result.value;
}

export default async (
  url: string,
  options: RecorderOptions = {}
): Promise<Readable> => {
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  const output = new Readable({
    read(size) {},
  });
  output.setEncoding('utf8');
  const browser = await getBrowserInstance(options);
  const page = await browser.pages().then((pages) => pages[0]);
  const client = page._client;
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

  const findTargetId = async (localFrame, interestingClassNames: string[]) => {
    const event = localFrame.find((prop) =>
      interestingClassNames.includes(prop.value.className)
    );
    const eventProperties = await client.send('Runtime.getProperties', {
      objectId: event.value.objectId as string,
    });
    const target = eventProperties.result.find(
      (prop) => prop.name === 'target'
    );
    return target.value.objectId;
  };

  const resume = async () => {
    await client.send('Debugger.setSkipAllPauses', { skip: true });
    await client.send('Debugger.resume', { terminateOnResume: false });
    await client.send('Debugger.setSkipAllPauses', { skip: false });
  };
  const skip = async () => {
    await client.send('Debugger.resume', { terminateOnResume: false });
  };

  const handleClickEvent = async (localFrame) => {
    const targetId = await findTargetId(localFrame, [
      'MouseEvent',
      'PointerEvent',
    ]);
    // Let submit handle this case if the click is on a submit button
    if (await isSubmitButton(client, targetId)) {
      return skip();
    }
    const selector = await getSelector(client, targetId);
    if (selector) {
      addLineToPuppeteerScript(`await click('${selector}');`);
    } else {
      console.log(`failed to generate selector`);
    }
    await resume();
  };

  const handleSubmitEvent = async (localFrame) => {
    const targetId = await findTargetId(localFrame, ['SubmitEvent']);
    const selector = await getSelector(client, targetId);
    if (selector) {
      addLineToPuppeteerScript(`await submit('${selector}');`);
    } else {
      console.log(`failed to generate selector`);
    }
    await resume();
  };

  const handleChangeEvent = async (localFrame) => {
    const targetId = await findTargetId(localFrame, ['Event']);
    const targetValue = await client.send('Runtime.callFunctionOn', {
      functionDeclaration: 'function() { return this.value }',
      objectId: targetId,
    });
    const value = targetValue.result.value;
    const escapedValue = value.replace(/'/g, "\\'");
    const selector = await getSelector(client, targetId);
    addLineToPuppeteerScript(`await type('${selector}', '${escapedValue}');`);
    await resume();
  };

  client.on('Debugger.paused', async function (
    pausedEvent: protocol.Protocol.Debugger.PausedEvent
  ) {
    const eventName = pausedEvent.data.eventName;
    const localFrame = pausedEvent.callFrames[0].scopeChain[0];
    const { result } = await client.send('Runtime.getProperties', {
      objectId: localFrame.object.objectId,
    });
    if (eventName === 'listener:click') {
      await handleClickEvent(result);
    } else if (eventName === 'listener:submit') {
      await handleSubmitEvent(result);
    } else if (eventName === 'listener:change') {
      await handleChangeEvent(result);
    } else {
      await skip();
    }
  });

  let identation = 0;
  const addLineToPuppeteerScript = (line: string) => {
    const data = '  '.repeat(identation) + line;
    output.push(data + '\n');
  };

  page.evaluateOnNewDocument(() => {
    window.addEventListener('change', (e) => {}, true);
    window.addEventListener('click', (e) => {}, true);
    window.addEventListener('submit', (e) => {}, true);
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
