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

import DOMNode, { DOMNodeType } from '../src/DOMNode';

describe('DOMNode', () => {
  it('should create a new DOM node', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    expect(node.nodeType).toBe(DOMNodeType.ELEMENT_NODE);
    expect(node.nodeName).toBe('div');
    expect(node.parentNode).toBe(null);
    expect(node.children).toHaveLength(0);
    expect(node.attributes.size).toBe(0);
  });

  it('should create a new DOM node with attributes', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test']);
    expect(node.attributes.size).toBe(1);
    expect(node.attributes.get('class')).toBe('test');
  });

  it('should create a new DOM node from payload', () => {
    const node = DOMNode.create({
      nodeName: 'div',
      nodeType: DOMNodeType.ELEMENT_NODE,
      attributes: ['class', 'test'],
    });

    expect(node.nodeType).toBe(DOMNodeType.ELEMENT_NODE);
    expect(node.nodeName).toBe('div');
    expect(node.parentNode).toBe(null);
    expect(node.children).toHaveLength(0);
    expect(node.attributes.size).toBe(1);
  });

  it('should append a child', () => {
    const parentNode = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const childNode = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');

    parentNode.appendChild(childNode);

    expect(childNode.parentNode).toBe(parentNode);
    expect(parentNode.children).toHaveLength(1);
    expect(childNode.prevSibling).toBe(null);
  });

  it('keep track of siblings', () => {
    const parentNode = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const childNode1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const childNode2 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');

    expect(childNode1.prevSibling).toBe(null);
    expect(childNode1.nextSibling).toBe(null);

    parentNode.appendChild(childNode1);

    expect(childNode1.prevSibling).toBe(null);
    expect(childNode1.nextSibling).toBe(null);
    
    parentNode.appendChild(childNode2);

    expect(childNode1.prevSibling).toBe(null);
    expect(childNode1.nextSibling).toBe(childNode2);

    expect(childNode2.prevSibling).toBe(childNode1);
    expect(childNode2.nextSibling).toBe(null);
  });

  it('keep track of children', () => {
    const parentNode = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const childNode1 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    const childNode2 = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');

    expect(parentNode.firstChild).toBe(null);
    expect(parentNode.lastChild).toBe(null);

    parentNode.appendChild(childNode1);
    
    expect(parentNode.firstChild).toBe(childNode1);
    expect(parentNode.lastChild).toBe(childNode1);
    
    parentNode.appendChild(childNode2);
    
    expect(parentNode.firstChild).toBe(childNode1);
    expect(parentNode.lastChild).toBe(childNode2);
  });

  it('should return a single attribute', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test']);
    
    expect(node.getAttribute('class')).toBe('test');
  });

  it('should return null if an attribute is not defined', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test']);
    
    expect(node.getAttribute('non-existent-attribute')).toBe(null);
  });

  it('should return a list of classes', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div', ['class', 'test1 test2 test3']);
    
    expect(node.classList).toEqual(['test1', 'test2', 'test3']);    
  });

  it('should return an empty list if the node does not have any classes', () => {
    const node = new DOMNode(DOMNodeType.ELEMENT_NODE, 'div');
    
    expect(node.classList).toHaveLength(0);    
  });

});
