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

import { getName, getRole } from 'aria-api';
import { cssPath } from './css-path';

export const isSubmitButton = (e: HTMLElement) => e.tagName === 'BUTTON' && (e as HTMLButtonElement).type === 'submit' && (e as HTMLButtonElement).form !== null;

export const getSelector = (e: HTMLElement) => {
  const name = getName(e);
  const role = getRole(e);
  if (name) return `aria/${role}[name="${name}"]`;

  const closest = e.closest('a,button');
  const closestName = closest && getName(closest);
  const closestRole = closest && getRole(closest);
  if (closestName && (!e.textContent || closestName.includes(e.textContent))) {
    const operator = (!e.textContent || e.textContent === closestName) ? '=' : '*=';
    return `aria/${closestRole}[name${operator}"${e.textContent || closestName}"]`;
  }

  return cssPath(e);
}
