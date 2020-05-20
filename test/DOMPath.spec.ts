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

import { cssPath } from '../src/DOMPath';
import { DOMNode, DOMNodeType } from '../src/dom';


describe('DOMPath', () => {
  it('should return an empty path if the given node is not an element node', () => {
    const node = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const path = cssPath(node);
    expect(path).toBe('');
  });

  it('should return an id selector if the node has an id', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['id', 'test']);
    const path = cssPath(node);
    expect(path).toBe('#test');
  });

  it('should return a path until the document', () => {
    const document = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const parent = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div1');
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div2');
    document.appendChild(parent);
    parent.appendChild(node);

    const path = cssPath(node);
    expect(path).toBe('div1 > div2');
  });

  it('should ignore siblings that are not element nodes', () => {
    const document = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const body = new DOMNode(DOMNodeType.ELEMENT_NODE, 'body');
    const sibling1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const sibling2 = new DOMNode(DOMNodeType.TEXT_NODE, '#text');
    document.appendChild(body);
    body.appendChild(sibling1);
    body.appendChild(sibling2);

    const path = cssPath(sibling1);
    expect(path).toBe('body > div');
  });

  it('should index children with nth-child if there are siblings with the same tag name', () => {
    const document = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const body = new DOMNode(DOMNodeType.ELEMENT_NODE, 'body');
    const sibling1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'p');
    const sibling2 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const sibling3 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    document.appendChild(body);
    body.appendChild(sibling1);
    body.appendChild(sibling2);
    body.appendChild(sibling3);

    const path = cssPath(sibling3);
    expect(path).toBe('body > div:nth-child(3)');
  });

  it('should not use nth-child if siblings with the same tag name are distinguishable by class name', () => {
    const document = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const body = new DOMNode(DOMNodeType.ELEMENT_NODE, 'body');
    const sibling1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test1 test2']);
    const sibling2 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test2 test3']);
    document.appendChild(body);
    body.appendChild(sibling1);
    body.appendChild(sibling2);

    const path = cssPath(sibling2);
    expect(path).toBe('body > div.test3');
  });

  it('should use nth-child if siblings with the same tag name are not distinguishable by class name', () => {
    const document = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const body = new DOMNode(DOMNodeType.ELEMENT_NODE, 'body');
    const sibling1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test1 test2']);
    const sibling2 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test2']);
    document.appendChild(body);
    body.appendChild(sibling1);
    body.appendChild(sibling2);

    const path = cssPath(sibling2);
    expect(path).toBe('body > div:nth-child(2)');
  });

  it('should include the type for input elements', () => {
    const document = new DOMNode(DOMNodeType.DOCUMENT_NODE, '#document');
    const body = new DOMNode(DOMNodeType.ELEMENT_NODE, 'body');
    const sibling1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'input', ['type', 'email']);
    document.appendChild(body);
    body.appendChild(sibling1);

    const path = cssPath(sibling1);
    expect(path).toBe('body > input[type="email"]');
  });

});
