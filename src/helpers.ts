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

/**
 * This implementation heavily inspired by DevTools DOMPath implementation:
 * https://source.chromium.org/chromium/chromium/src/+/master:third_party/devtools-frontend/src/front_end/elements/DOMPath.js
 */

export function cssPath() {
  const node = this;
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  function idSelector(id: string) {
    return '#' + id;
  }

  class Step {
    public readonly value: string;
    public readonly optimized: boolean;

    constructor(value: string, optimized: boolean) {
      this.value = value;
      this.optimized = optimized;
    }
    toString() {
      return this.value;
    }
  }

  function cssPathStep(node: Element, isTargetNode: boolean): Step {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }
    const id = node.getAttribute('id');
    if (id) {
      return new Step(idSelector(id), true);
    }
    const nodeNameLower = node.nodeName.toLowerCase();
    if (['html', 'body', 'head'].includes(nodeNameLower)) {
      return new Step(nodeNameLower, true);
    }
    const nodeName = node.nodeName;
    const parent = node.parentNode;
    if (!parent || parent.nodeType === Node.DOCUMENT_NODE) {
      return new Step(nodeNameLower, true);
    }
    let needsClassNames = false;
    let needsNthChild = false;
    let ownIndex = -1;
    let elementIndex = -1;
    const siblings = parent.children;
    const ownClassNames = new Set(node.classList);
    for (
      let i = 0;
      (ownIndex === -1 || !needsNthChild) && i < siblings.length;
      i++
    ) {
      const sibling = siblings[i];
      if (sibling.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      elementIndex += 1;
      if (sibling === node) {
        ownIndex = elementIndex;
        continue;
      }
      if (sibling.nodeName !== nodeName) {
        continue;
      }
      needsClassNames = true;
      if (!ownClassNames.size) {
        needsNthChild = true;
        continue;
      }
      const siblingClassNames = new Set(sibling.classList);
      for (const siblingClass of siblingClassNames) {
        if (!ownClassNames.has(siblingClass)) {
          continue;
        }
        ownClassNames.delete(siblingClass);
        if (!ownClassNames.size) {
          needsNthChild = true;
          break;
        }
      }
    }
    let result = nodeNameLower;
    if (
      isTargetNode &&
      nodeName.toLowerCase() === 'input' &&
      node.getAttribute('type') &&
      !node.getAttribute('id') &&
      !node.getAttribute('class')
    ) {
      result += `[type="${node.getAttribute('type')}"]`;
    }
    if (needsNthChild) {
      result += `:nth-child(${ownIndex + 1})`;
    } else if (needsClassNames) {
      for (const className of ownClassNames) {
        result += '.' + className;
      }
    }
    return new Step(result, false);
  }
  const steps = [];
  let currentNode = node;
  while (currentNode) {
    const step = cssPathStep(currentNode, currentNode === node);
    if (!step) {
      break;
    }
    steps.push(step);
    if (step.optimized) {
      break;
    }
    currentNode = currentNode.parentNode as Element;
  }
  steps.reverse();
  return steps.join(' > ');
}
