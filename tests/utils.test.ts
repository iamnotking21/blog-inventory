import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatMoney,
  formatNumber,
  toNumber,
} from "@/lib/utils";

describe("toNumber", () => {
  it("parses the strings Postgres returns for numeric columns", () => {
    // node-postgres hands back `numeric` as a string to avoid float precision
    // loss, so every money value reaches the UI as text.
    expect(toNumber("1234.50")).toBe(1234.5);
    expect(toNumber("0")).toBe(0);
  });

  it("passes numbers through untouched", () => {
    expect(toNumber(42)).toBe(42);
  });

  it("falls back to zero rather than producing NaN", () => {
    // A NaN reaching a total would render as "NaN" across the dashboard.
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("not a number")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats a numeric string as currency", () => {
    expect(formatMoney("1234.5")).toContain("1,234.50");
  });

  it("does not throw on a null value", () => {
    expect(() => formatMoney(null)).not.toThrow();
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber("12000")).toContain("12,000");
  });
});

describe("formatDate", () => {
  it("renders an em dash for a missing date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("renders an em dash rather than 'Invalid Date'", () => {
    expect(formatDate("clearly not a date")).toBe("—");
  });

  it("formats a real timestamp", () => {
    expect(formatDate("2024-03-15T10:00:00Z")).toContain("2024");
  });
});
