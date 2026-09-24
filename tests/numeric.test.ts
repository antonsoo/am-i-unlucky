import { describe, expect, it } from "vitest";
import {
  kahanSum,
  logChoose,
  logGamma,
  regularizedIncompleteBeta,
} from "../src/math/numeric.js";

describe("logGamma", () => {
  it("matches known factorial values: Gamma(n+1) = n!", () => {
    expect(Math.exp(logGamma(6))).toBeCloseTo(120, 6); // 5!
    expect(Math.exp(logGamma(11))).toBeCloseTo(3628800, 3); // 10!
  });
  it("Gamma(0.5) = sqrt(pi)", () => {
    expect(Math.exp(logGamma(0.5))).toBeCloseTo(Math.sqrt(Math.PI), 9);
  });
});

describe("logChoose", () => {
  it("matches small binomial coefficients", () => {
    expect(Math.exp(logChoose(5, 2))).toBeCloseTo(10, 9);
    expect(Math.exp(logChoose(10, 0))).toBeCloseTo(1, 9);
    expect(Math.exp(logChoose(10, 10))).toBeCloseTo(1, 9);
  });
  it("is symmetric", () => {
    expect(logChoose(20, 7)).toBeCloseTo(logChoose(20, 13), 9);
  });
});

describe("regularizedIncompleteBeta", () => {
  it("I_x(a,b) + I_{1-x}(b,a) = 1", () => {
    const a = 3;
    const b = 5;
    const x = 0.4;
    expect(
      regularizedIncompleteBeta(x, a, b) +
        regularizedIncompleteBeta(1 - x, b, a),
    ).toBeCloseTo(1, 9);
  });
  it("is 0 at x=0 and 1 at x=1", () => {
    expect(regularizedIncompleteBeta(0, 2, 3)).toBe(0);
    expect(regularizedIncompleteBeta(1, 2, 3)).toBe(1);
  });
  it("I_0.5(1,1) = 0.5 (uniform distribution special case)", () => {
    expect(regularizedIncompleteBeta(0.5, 1, 1)).toBeCloseTo(0.5, 9);
  });
});

describe("kahanSum", () => {
  it("matches naive summation for well-conditioned inputs", () => {
    const values = Array.from({ length: 1000 }, (_, i) => i * 0.001);
    const naive = values.reduce((a, b) => a + b, 0);
    expect(kahanSum(values)).toBeCloseTo(naive, 9);
  });
  it("handles empty input", () => {
    expect(kahanSum([])).toBe(0);
  });
});
