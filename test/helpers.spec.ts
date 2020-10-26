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

import * as helpers from '../src/helpers';

const cssPath = (node: Node) => helpers.cssPath.bind(node)();

describe('CSS Path', () => {
  it('should return an empty path if the given node is not an element node', () => {
    const path = cssPath(document);
    expect(path).toBe('');
  });

  it('should return an id selector if the node has an id', () => {
    document.body.innerHTML = `<div id="test" data-id="test"></div>`;
    const node = document.querySelector('[data-id="test"]');
    const path = cssPath(node);
    expect(path).toBe('#test');
  });

  it('should return a path until the document', () => {
    document.body.innerHTML = `<div><p data-id="test"></p></div>`;
    const node = document.querySelector('[data-id="test"]');
    const path = cssPath(node);
    expect(path).toBe('body > div > p');
  });

  it('should ignore siblings that are not element nodes', () => {
    document.body.innerHTML = `<div data-id="test"></div> Hello World`;
    const node = document.querySelector('[data-id="test"]');

    const path = cssPath(node);
    expect(path).toBe('body > div');
  });

  it('should index children with nth-child if there are siblings with the same tag name', () => {
    document.body.innerHTML = `<p></p><div></div><div data-id="test"></div>`;
    const node = document.querySelector('[data-id="test"]');

    const path = cssPath(node);
    expect(path).toBe('body > div:nth-child(3)');
  });

  it('should not use nth-child if siblings with the same tag name are distinguishable by class name', () => {
    document.body.innerHTML = `<div class="test1 test2"></div><div class="test2 test3" data-id="test"></div>`;
    const node = document.querySelector('[data-id="test"]');

    const path = cssPath(node);
    expect(path).toBe('body > div.test3');
  });

  it('should use nth-child if siblings with the same tag name are not distinguishable by class name', () => {
    document.body.innerHTML = `<div class="test1 test2"></div><div class="test2" data-id="test"></div>`;
    const node = document.querySelector('[data-id="test"]');

    const path = cssPath(node);
    expect(path).toBe('body > div:nth-child(2)');
  });

  it('should include the type for input elements', () => {
    document.body.innerHTML = `<input type="email" data-id="test"/>`;
    const node = document.querySelector('[data-id="test"]');

    const path = cssPath(node);
    expect(path).toBe('body > input[type="email"]');
  });
});
