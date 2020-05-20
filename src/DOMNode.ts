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

export enum DOMNodeType {
  ELEMENT_NODE = 1,
  ATTRIBUTE_NODE = 2,
  TEXT_NODE = 3,
  CDATA_SECTION_NODE = 4,
  ENTITY_REFERENCE_NODE = 5,
  ENTITY_NODE = 6,
  PROCESSING_INSTRUCTION_NODE = 7,
  COMMENT_NODE = 8,
  DOCUMENT_NODE = 9,
  DOCUMENT_TYPE_NODE = 10,
  DOCUMENT_FRAGMENT_NODE = 11,
  NOTATION_NODE = 12,
}

export default class DOMNode {
  public readonly parentNode: DOMNode | null;
  public readonly nodeName: string;
  public readonly children: DOMNode[];
  public readonly attributes: Map<string, string>;
  public readonly nodeType: DOMNodeType;

  constructor(nodeType, nodeName, attributes = null) {
    this.parentNode = null;
    this.nodeName = nodeName;
    this.children = [];
    this.attributes = new Map();
    this.nodeType = nodeType;

    if (attributes) {
      for (let i = 0; i < attributes.length; i += 2) {
        this.attributes.set(attributes[i], attributes[i + 1]);
      }
    }
  }

  static create(payload) {
    return new DOMNode(payload.nodeType, payload.nodeName, payload.attributes);
  }

  appendChild(node) {
    node.parentNode = this;
    this.children.push(node);
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  get classList() {
    const classNames = this.getAttribute("class");
    if (!classNames) return [];
    return classNames.split(/\s+/g);
  }

  get firstChild() {
    return this.children.length ? this.children[0] : null;
  }

  get lastChild() {
    return this.children.length
      ? this.children[this.children.length - 1]
      : null;
  }

  get nextSibling() {
    if (!this.parentNode) return null;

    const index = this.parentNode.children.indexOf(this);
    return this.parentNode.children[index + 1] || null;
  }

  get prevSibling() {
    if (!this.parentNode) return null;

    const index = this.parentNode.children.indexOf(this);
    return index >= 1 ? this.parentNode.children[index - 1] : null;
  }
}
