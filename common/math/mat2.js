import {Tensor} from "./tensor.js";
import Vec2 from "./vec2.js";
export default class Mat2 extends Tensor {
  constructor(values) {
    super([2, 2]);
    if (values) {
      this.flatvalues = values;
    }
  }
  get width() {
    return this.dimensions[0];
  }
  get height() {
    return this.dimensions[1];
  }
  get values() {
    let result = [];
    for (let i = 0; i < this.width; ++i) {
      result.push([]);
      for (let j = 0; j < this.height; ++j) {
        result[i]?.push(super._at([i, j]));
      }
    }
    return result;
  }
  at(i, j) {
    return super._at([i, j]);
  }
  set(i, j, value) {
    super._set([i, j], value);
  }
  row(row) {
    let result = [];
    for (let i = 0; i < this.width; ++i) {
      result.push(super._at([row, i]));
    }
    return new Vec2(result);
  }
  col(col) {
    let result = [];
    for (let i = 0; i < this.height; ++i) {
      result.push(super._at([i, col]));
    }
    return new Vec2(result);
  }
}
