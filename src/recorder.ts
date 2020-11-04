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

type AXNode = protocol.Protocol.Accessibility.AXNode;
type CDPSession = puppeteer.CDPSession;

// We check that a selector uniquely selects an element by querying the
// selector and checking that all found elements are in the subtree of the
// target.
async function checkUnique(
  client: CDPSession,
  ignored: AXNode[],
  name?: string,
  role?: string
) {
  const { root } = await client.send('DOM.getDocument', { depth: 0 });
  const checkName = await client.send('Accessibility.queryAXTree', {
    backendNodeId: root.backendNodeId,
    accessibleName: name,
    role: role,
  });
  const ignoredIds = new Set(ignored.map((axNode) => axNode.backendDOMNodeId));
  const checkNameMinusTargetTree = checkName.nodes.filter(
    (axNode) => !ignoredIds.has(axNode.backendDOMNodeId)
  );
  return checkNameMinusTargetTree.length < 2;
}

export async function getSelector(
  client: puppeteer.CDPSession,
  objectId: string
): Promise<string | null> {
  let currentObjectId = objectId;
  let prevName = '';
  while (currentObjectId) {
    const queryResp = await client.send('Accessibility.queryAXTree', {
      objectId: currentObjectId,
    });
    const targetNodes = queryResp.nodes;
    if (targetNodes.length === 0) break;
    const axNode = targetNodes[0];
    const name: string = axNode.name.value;
    const role: string = axNode.role.value;
    // If the name does not include the child name, we have probably reached a
    // completely different entity so we give up and pick a CSS selector.
    if (!name.includes(prevName)) break;
    prevName = name;
    const uniqueName = await checkUnique(client, targetNodes, name);
    if (name && uniqueName) {
      return `aria/${name}`;
    }
    const uniqueNameRole = await checkUnique(client, targetNodes, name, role);
    if (name && role && uniqueNameRole) {
      return `aria/${name}[role="${role}"]`;
    }
    const { result } = await client.send('Runtime.callFunctionOn', {
      functionDeclaration: helpers.getParent.toString(),
      objectId: currentObjectId,
    });
    currentObjectId = result.objectId;
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
  page.on('domcontentloaded', async () => {
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

  const skip = async () => {
    await client.send('Debugger.resume', { terminateOnResume: false });
  };
  const resume = async () => {
    await client.send('Debugger.setSkipAllPauses', { skip: true });
    await skip();
    await client.send('Debugger.setSkipAllPauses', { skip: false });
  };

  const handleClickEvent = async (localFrame) => {
    const targetId = await findTargetId(localFrame, [
      'MouseEvent',
      'PointerEvent',
    ]);
    // Let submit handle this case if the click is on a submit button.
    if (await isSubmitButton(client, targetId)) {
      return skip();
    }
    const selector = await getSelector(client, targetId);
    if (selector) {
      addLineToPuppeteerScript(`await click(${JSON.stringify(selector)});`);
    } else {
      console.log(`failed to generate selector`);
    }
    await resume();
  };

  const handleSubmitEvent = async (localFrame) => {
    const targetId = await findTargetId(localFrame, ['SubmitEvent']);
    const selector = await getSelector(client, targetId);
    if (selector) {
      addLineToPuppeteerScript(`await submit(${JSON.stringify(selector)});`);
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
    const selector = await getSelector(client, targetId);
    addLineToPuppeteerScript(
      `await type(${JSON.stringify(selector)}, ${JSON.stringify(value)});`
    );
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
    window.addEventListener('change', (event) => {}, true);
    window.addEventListener('click', (event) => {}, true);
    window.addEventListener('submit', (event) => {}, true);
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
      `expect(page.url()).resolves.toBe(${JSON.stringify(frame.url())});`
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
