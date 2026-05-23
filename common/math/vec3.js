import {Tensor} from "./tensor.js";
export default class Vec3 extends Tensor {
  constructor(values) {
    super([3]);
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
  add(rhs) {
    let l = this.values;
    let r = rhs.values;
    for (let i = 0; i < l.length; ++i) {
      l[i] += r[i];
    }
    return new Vec3(l);
  }
  subtract(rhs) {
    let l = this.values;
    let r = rhs.values;
    for (let i = 0; i < l.length; ++i) {
      l[i] -= r[i];
    }
    return new Vec3(l);
  }
}
