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

export {};

declare global {
  interface Window {
    addLineToPuppeteerScript: (line: string) => void;
  }
  interface Element {
    computedName: string;
    computedRole: string;
  }
}

describe('Injected Script', () => {
  let fn;
  beforeEach(() => {
    require('../src/injected');
    Element.prototype.computedName = '';
    Element.prototype.computedRole = '';
    fn = window.addLineToPuppeteerScript = jest.fn();
  });

  it('should emit a click line for click events', () => {
    Element.prototype.computedName = 'Hello World';
    Element.prototype.computedRole = 'button';
    document.body.innerHTML = `<div><button data-id="test">Hello World</button></div>`;
    const element = document.querySelector(
      '[data-id="test"]'
    ) as HTMLButtonElement;
    element.click();
    expect(fn).toHaveBeenCalledWith(`await click('aria/Hello World[role="button"]');`);
  });

  it('should only emit submit line for click events on submit buttons in forms', () => {
    document.body.innerHTML = `<form onsubmit="return false;"><button data-id="test">Hello World</button></form>`;
    const element = document.querySelector(
      '[data-id="test"]'
    ) as HTMLButtonElement;
    element.click();
    expect(fn).toHaveBeenCalledWith(`await submit('body > form');`);
  });

  it('should emit type lines when a form input was changed', () => {
    document.body.innerHTML = `<form onsubmit="return false;"><input data-id="test"/></form>`;
    const element = document.querySelector(
      '[data-id="test"]'
    ) as HTMLInputElement;
    element.value = 'Hello World';
    element.dispatchEvent(new Event('change', { bubbles: true }));
    expect(fn).toHaveBeenCalledWith(
      `await type('body > form > input', 'Hello World');`
    );
  });

  it('should emit type lines with correctly escaped single quotes', () => {
    document.body.innerHTML = `<form onsubmit="return false;"><input data-id="test"/></form>`;
    const element = document.querySelector(
      '[data-id="test"]'
    ) as HTMLInputElement;
    element.value = "You're welcome";
    element.dispatchEvent(new Event('change', { bubbles: true }));
    expect(fn).toHaveBeenCalledWith(
      `await type('body > form > input', 'You\\'re welcome');`
    );
  });
});
