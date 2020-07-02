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

import DOMNode from './DOMNode';

export default class DOMModel {
  public document: DOMNode | null;
  private _nodesById: Map<number, DOMNode>;

  constructor() {
    this._nodesById = new Map();
    this.document = null;
  }

  load(document) {
    this.loadNode(document.root);
  }

  loadNode = (root) => {
    const stack = [root];
    while (stack.length) {
      const data = stack.shift();

      const node = DOMNode.create(data);
      this._nodesById.set(data.nodeId, node);
      if (!this.document) {
        this.document = node;
      }

      if (data.parentId) {
        const parent = this._nodesById.get(data.parentId);
        parent.appendChild(node);
      }

      if (data.children) stack.push(...data.children);
      if (data.shadowRoots) stack.push(...data.shadowRoots);
      if (data.pseudoElements) stack.push(...data.pseudoElements);
    }
  };

  setChildNodes({parentId, nodes}) {
    const parent = this._nodesById.get(parentId);
    if (!parent) return;

    for (const node of nodes) {
      this.loadNode(node);
    }
  }

  get(id) {
    return this._nodesById.get(id);
  }

  toString() {
    let depth = 0;
    const output = [];
    function append(line) {
      output.push("  ".repeat(depth) + line);
    }
    let currentNode = this.document;
    while (currentNode) {
      append(currentNode.nodeName);
      if (currentNode.firstChild) {
        depth += 1;
        currentNode = currentNode.firstChild;
      } else if (currentNode.nextSibling) {
        currentNode = currentNode.nextSibling;
      } else if (currentNode.parentNode) {
        depth -= 1;
        currentNode = currentNode.parentNode.nextSibling;
      } else {
        break;
      }
    }

    return output.join("\n");
  }
}
