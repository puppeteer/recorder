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

import DOMModel from '../src/DOMModel';

import getDocumentPayload from './fixtures/getDocument';
import setChildNodesPayload from './fixtures/setChildNodes';
import { DOMNode } from '../src/dom';

describe('DOMMode', () => {
  it('should create a new DOM model', () => {
    const model = new DOMModel();

    expect(model.document).toBe(null)
  });

  it('should load a new DOM document from payload', () => {
    const model = new DOMModel();
    model.load(getDocumentPayload);

    expect(model.document).toBeInstanceOf(DOMNode);
  });

  it('update child nodes from document payload', () => {
    const model = new DOMModel();
    model.load(getDocumentPayload);
    model.setChildNodes(setChildNodesPayload);

    expect(model.document).toBeInstanceOf(DOMNode);
  });

  it('should return a single node by id', () => {
    const model = new DOMModel();
    model.load(getDocumentPayload);

    const node = model.get(5);

    expect(node).toBeInstanceOf(DOMNode);
    expect(node.nodeName).toBe('BODY');
  });

  it('should return a string representing the dom tree', () => {
    const model = new DOMModel();
    model.load(getDocumentPayload);

    expect(model.toString()).toMatchSnapshot();
  });
});
