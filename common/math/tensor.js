export class Tensor {
  constructor(dimensions) {
    this.flatvalues = [];
    this.dimensions = dimensions;
    const size = dimensions.reduce((prev, cur) => {
      return prev * cur;
    });
    for (let i = 0; i < size; ++i) {
      this.flatvalues.push(0);
    }
  }
  get DIM() {
    return this.dimensions.length;
  }
  get flatsize() {
    return this.flatvalues.length;
  }
  _at(index) {
    return this.flatvalues[this._idx(index)] ?? 0;
  }
  _set(index, value) {
    this.flatvalues[this._idx(index)] = value;
  }
  _idx(index) {
    let idx = 0;
    for (let i = 0; i < this.DIM; ++i) {
      let tmp = index[i] ?? 0;
      for (let j = i - 1; j >= 0; --j) {
        tmp *= this.dimensions[j] ?? 0;
      }
      idx += tmp;
    }
    return idx;
  }
}
