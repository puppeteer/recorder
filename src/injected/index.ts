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

import { getSelector, isSubmitButton } from './dom-helpers';

declare global {
  function addLineToPuppeteerScript(line: string): void;
}

window.addEventListener('click', (e) => {
  // Let submit handle this case if the click is on a submit button
  let currentElement = e.target as HTMLElement;
  while (currentElement) {
    if (isSubmitButton(currentElement)) {
      return;
    }
    currentElement = currentElement.parentElement;
  }

  const selector = getSelector(e.target as HTMLElement);
  addLineToPuppeteerScript(`await click('${selector}');`);
}, true);

window.addEventListener('change', (e) => {
  const value = (e.target as HTMLInputElement).value;
  const escapedValue = value.replace(/'/g, '\\\'');
  const selector = getSelector(e.target as HTMLElement);
  addLineToPuppeteerScript(`await type('${selector}', '${escapedValue}');`);
}, true);

window.addEventListener('submit', (e) => {
  const selector = getSelector(e.target as HTMLElement);
  addLineToPuppeteerScript(`await submit('${selector}');`);
}, true);
