import { describe, it, expect } from "vitest";
import { normalizePosition } from "./normalize";

describe("normalizePosition", () => {
  it("maps Goalkeeper", () => {
    expect(normalizePosition("Goalkeeper")).toBe("Goalkeeper");
  });

  it("maps Defence to Defender", () => {
    expect(normalizePosition("Defence")).toBe("Defender");
  });

  it("maps Defender to Defender", () => {
    expect(normalizePosition("Defender")).toBe("Defender");
  });

  it("maps Midfield to Midfielder", () => {
    expect(normalizePosition("Midfield")).toBe("Midfielder");
  });

  it("maps Midfielder to Midfielder", () => {
    expect(normalizePosition("Midfielder")).toBe("Midfielder");
  });

  it("maps Offence to Attacker", () => {
    expect(normalizePosition("Offence")).toBe("Attacker");
  });

  it("maps Attacker to Attacker", () => {
    expect(normalizePosition("Attacker")).toBe("Attacker");
  });

  it("returns null for empty/null/undefined", () => {
    expect(normalizePosition(null)).toBeNull();
    expect(normalizePosition(undefined)).toBeNull();
    expect(normalizePosition("")).toBeNull();
  });

  it("passes through unknown values", () => {
    expect(normalizePosition("Wing-back")).toBe("Wing-back");
  });
});
