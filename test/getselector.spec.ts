/**
 * @jest-environment node
 */

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
import { getSelector, isSubmitButton } from '../src/recorder';

declare module 'puppeteer' {
  interface ElementHandle {
    _remoteObject: { objectId: string };
  }
  interface Page {
    _client: puppeteer.CDPSession;
  }
}

let browser: puppeteer.Browser,
  page: puppeteer.Page,
  client: puppeteer.CDPSession;

describe('DOM', () => {
  beforeAll(async () => {
    browser = await puppeteer.launch({ defaultViewport: null, headless: true });
    page = await browser.newPage();
    client = page._client;
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('isSubmitButton', () => {
    it('should return true if the button is a submit button', async () => {
      await page.setContent(`<form><button id="button"</button></form>`);

      const element = await page.$('button');
      const isSubmitCheck = await isSubmitButton(
        client,
        element._remoteObject.objectId
      );
      expect(isSubmitCheck).toBe(true);
    });

    it('should return false if the button is not a submit button', async () => {
      await page.setContent(`<button id="button"></button>`);
      const element = await page.$('button');
      const isSubmitCheck = await isSubmitButton(
        client,
        element._remoteObject.objectId
      );
      expect(isSubmitCheck).toBe(false);
    });
  });

  describe('getSelector', () => {
    it('should return the aria name if it is available', async () => {
      await page.setContent(
        `<form><button id="button">Hello World</button></form>`
      );

      const element = await page.$('button');
      const selector = await getSelector(
        client,
        element._remoteObject.objectId
      );
      expect(selector).toBe('aria/Hello World[role="button"]');
    });

    it('should return an aria name selector for the closest link or button', async () => {
      await page.setContent(
        `<form><button><span id="button">Hello World</span></button></form>`
      );

      const element = await page.$('button');
      const selector = await getSelector(
        client,
        element._remoteObject.objectId
      );
      expect(selector).toBe('aria/Hello World[role="button"]');
    });

    it('should return an aria name selector for the closest link or button if the text is not an exact match', async () => {
      await page.setContent(
        `<form><button><span id="button">Hello</span> World</button></form>`
      );

      const element = await page.$('#button');
      const selector = await getSelector(
        client,
        element._remoteObject.objectId
      );
      expect(selector).toBe('aria/Hello World[role="button"]');
    });

    it('should return css selector if the element is not identifiable by an aria selector', async () => {
      await page.setContent(
        `<form><div><span id="button">Hello</span> World</div></form>`
      );

      const element = await page.$('#button');
      const selector = await getSelector(
        client,
        element._remoteObject.objectId
      );
      expect(selector).toBe('#button');
    });

    it('should pierce shadow roots to get an aria name', async () => {
      await page.setContent(
        `
        <script>
          window.addEventListener('DOMContentLoaded', () => {
            const link = document.createElement('a');
            link.setAttribute('role', 'link');
            link.textContent = 'Hello ';
            document.body.appendChild(link);
            const span1 = document.createElement('span');
            link.appendChild(span1);
            const shadow = span1.attachShadow({mode: 'open'});
            const span2 = document.createElement('span');
            span2.textContent = 'World';
            shadow.appendChild(span2);
          });
        </script>
        `
      );
      const link = await page.$('a');
      const selector = await getSelector(client, link._remoteObject.objectId);
      expect(selector).toBe('aria/Hello World[role="link"]');
    });
  });
});
