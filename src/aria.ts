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

import { readFileSync } from 'fs';
import * as path from 'path';

 export function loadAndPatchAriaModule() {
   // Load aria implementation from https://github.com/xi/aria-api (MIT Licensed)
  let script = readFileSync(path.join(__dirname, '../lib/inject.js'), { encoding: 'utf-8' })
  script = script.replace(`var childNodes = [];`, `var childNodes = Array.from(node.shadowRoot?.childNodes || []).filter(n => !getOwner(n) && !isHidden(n))`);
  // Todo(https://github.com/puppeteer/recorder/issues/15): Check if this is the right approach
  script = script.replace(`'input[type="text"]:not([list])',`, `'input[type="text"]:not([list])',\n'input[type="password"]:not([list])',`);

  return script;
 }