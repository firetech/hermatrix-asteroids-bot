import {Tensor} from "./tensor.js";
export default class Vec2 extends Tensor {
  constructor(values) {
    super([2]);
    if (values) {
      this.flatvalues = values;
    }
  }
  get size() {
    return this.dimensions[0];
  }
  get values() {
    let result = [];
    for (let i = 0; i < this.size; ++i) {
      result.push(super._at([i]));
    }
    return result;
  }
  get length() {
    let res = 0;
    this.values.forEach((val) => {
      res += val * val;
    });
    return Math.sqrt(res);
  }
  at(i) {
    return super._at([i]);
  }
  set(i, value) {
    return super._set([i], value);
  }
  cross(rhs) {
    return this.at(0) * rhs.at(1) - this.at(1) * rhs.at(0);
  }
  add(rhs) {
    let l = this.values;
    let r = rhs.values;
    for (let i = 0; i < l.length; ++i) {
      l[i] += r[i];
    }
    return new Vec2(l);
  }
  subtract(rhs) {
    let l = this.values;
    let r = rhs.values;
    for (let i = 0; i < l.length; ++i) {
      l[i] -= r[i];
    }
    return new Vec2(l);
  }
}
