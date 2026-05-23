import {Vec2} from "./math/math.js";
export class Segment {
  constructor(from, to) {
    this.basis = new Vec2(from.values);
    this.to = to.subtract(from);
  }
}
export class Vertex {
  constructor(p1, p2) {
    this.p1 = p1;
    this.p2 = p2;
  }
  length() {
    return this.p2.subtract(this.p1).length;
  }
}
export function segmentsIntersect(lhs, rhs) {
  const p = lhs.basis;
  const r = lhs.to;
  const q = rhs.basis;
  const s = rhs.to;
  const r_x_s = r.cross(s);
  const qp_x_r = q.subtract(p).cross(r);
  const qp_x_s = q.subtract(p).cross(s);
  if (r_x_s == 0 && qp_x_r == 0) {
    return false;
  }
  if (r_x_s == 0 && qp_x_r != 0) {
    return false;
  }
  if (r_x_s != 0) {
    const t = qp_x_s / r_x_s;
    const u = qp_x_r / r_x_s;
    if (0 <= t && t <= 1 && 0 <= u && u <= 1) {
      return true;
    }
  }
  return false;
}
export function isInsideObject(vertices, point) {
  const to = point.add(new Vec2([1e7, 0]));
  var intersections = 0;
  const segA = new Segment(point, to);
  vertices.forEach((vertex) => {
    const segB = new Segment(vertex.p1, vertex.p2);
    if (segmentsIntersect(segA, segB)) {
      ++intersections;
    }
  });
  return intersections % 2 == 1;
}
