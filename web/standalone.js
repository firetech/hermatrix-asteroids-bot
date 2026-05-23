/*
 * Code for initializing the Asteroid game that was part of the
 * hermatrix.net ARG in July 2021 as a web worker.
 *
 * Copyright 2025 Joakim "firetech" Tufvegren
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 */

import SocketEmulator from "./common/socketemul.js";

export class WorkerSocket extends SocketEmulator {
  constructor(worker) {
    super();

    this.worker = worker;

    const self = this;
    worker.onmessage = function(e) {
      if (self.callbacks.has(e.data[0])) {
        self.callbacks.get(e.data[0])(...e.data[1]);
      }
    };
  }
  emit(name, ...args) {
    this.worker.postMessage([name, args]);
  }
}

export default function standaloneSocketInit() {
  const worker = new Worker(new URL("gameworker.js", import.meta.url), { type: "module" });

  return new WorkerSocket(worker);
}
