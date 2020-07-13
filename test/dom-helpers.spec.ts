/**
 * @jest-environment jsdom
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

import { isSubmitButton, getSelector } from '../src/injected/dom-helpers';

describe('DOM', () => {
  describe('isSubmitButton', () => {
    it('should return true if the button is a submit button', () => {
      document.body.innerHTML = `<form><button id="button" /></form>`;

      const element = document.getElementById('button') as any;
      expect(isSubmitButton(element)).toBe(true);
    });

    it('should return false if the button is not a submit button', () => {
      document.body.innerHTML = `<button id="button" />`;

      const element = document.getElementById('button');
      expect(isSubmitButton(element)).toBe(false);
    });
  });

  describe('getSelector', () => {
    it('should return the aria name if it is available', () => {
      document.body.innerHTML = `<form><button id="button">Hello World</button></form>`;

      const element = document.getElementById('button') as any;
      expect(getSelector(element)).toBe('aria/button[name="Hello World"]');
    });

    it('should return an aria name selector for the closest link or button', () => {
      document.body.innerHTML = `<form><button><span id="button">Hello World</span></button></form>`;

      const element = document.getElementById('button') as any;
      expect(getSelector(element)).toBe('aria/button[name="Hello World"]');
    });

    it('should return an aria name like selector for the closest link or button if the text is not an exact match', () => {
      document.body.innerHTML = `<form><button><span id="button">Hello</span> World</button></form>`;

      const element = document.getElementById('button') as any;
      expect(getSelector(element)).toBe('aria/button[name*="Hello"]');
    });

    it('should return css selector if the element is not identifiable by an aria selector', () => {
      document.body.innerHTML = `<form><div><span id="button">Hello</span> World</div></form>`;

      const element = document.getElementById('button') as any;
      expect(getSelector(element)).toBe('#button');
    });

    // This is currently not testable because it relies on hot patching the aria-api module
    it.skip('should pierce shadow roots to get an aria name', () => {
      const link = document.createElement('a');
      document.body.appendChild(link);
      const span1 = document.createElement('span');
      link.appendChild(span1);
      const shadow = span1.attachShadow({mode: 'open'});
      const span2 = document.createElement('span');
      span2.textContent = 'Hello World';
      shadow.appendChild(span2);

      expect(getSelector(link)).toBe('aria/link[name="Hello World"]');
    });
  });
});
