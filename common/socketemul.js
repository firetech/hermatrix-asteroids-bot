export default class SocketEmulator {
  constructor() {
    this.callbacks = new Map();
  }
  on(name, cb) {
    this.callbacks.set(name, cb);
  }
  emit(name, ...args) {
    if (this.callbacks.has(name)) {
      this.callbacks.get(name)(...args);
    }
  }
  close() {
  }
}
