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

import { cssPath } from './css-path';

declare global {
  interface Element {
    computedName: string;
    computedRole: string;
  }
}

export const isSubmitButton = (e: HTMLElement) => e.tagName === 'BUTTON' && (e as HTMLButtonElement).type === 'submit' && (e as HTMLButtonElement).form !== null;

export const getSelector = (targetNode: HTMLElement) => {
  let currentNode = targetNode;
  const name = currentNode.computedName;
  const role = currentNode.computedRole;
  if (name && role) {
    return `aria/${name}[role="${role}"]`;
  }
  return cssPath(targetNode);
};

export const getSelectorForEvent = (e: Event) =>
  getSelector((e.composedPath ? e.composedPath()[0] : e.target) as HTMLElement);
