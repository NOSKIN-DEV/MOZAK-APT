import { describe, expect, it } from "vitest";
import { MAX_TEXT_LENGTH, codePointLength, hasControlChars, sanitizeText } from "./sanitize";

/**
 * Etapa 13 — HU-23 / MTC_00270: limpieza de texto de entrada.
 */
describe("sanitizeText", () => {
  it("recorta los extremos y colapsa espacios, tabulaciones y saltos de línea", () => {
    expect(sanitizeText("  teatro \t  infantil\n ")).toEqual({ ok: true, value: "teatro infantil" });
  });

  it("normaliza a NFC: letras con tilde combinante quedan como las precompuestas", () => {
    const decomposed = "Ñuñoa".normalize("NFD"); // N + ~ combinante + u + n + ~ + o + a
    expect(decomposed).not.toBe("Ñuñoa");
    expect(sanitizeText(decomposed)).toEqual({ ok: true, value: "Ñuñoa" });
  });

  it("un texto vacío o solo de espacios es válido y queda vacío", () => {
    expect(sanitizeText("   ")).toEqual({ ok: true, value: "" });
  });

  it("conserva comillas, %, _ y etiquetas: no son peligrosas con consultas parametrizadas", () => {
    expect(sanitizeText("d'Orsay 100% <b>")).toEqual({ ok: true, value: "d'Orsay 100% <b>" });
  });

  it("rechaza el byte nulo (PostgreSQL no puede almacenarlo ni compararlo)", () => {
    expect(sanitizeText("abc\u0000def")).toEqual({ ok: false, reason: "control-chars" });
  });

  it("rechaza otros caracteres de control (ESC, DEL)", () => {
    expect(sanitizeText("a\u001bb")).toEqual({ ok: false, reason: "control-chars" });
    expect(sanitizeText("a\u007fb")).toEqual({ ok: false, reason: "control-chars" });
  });

  it("acepta exactamente el largo máximo y rechaza un carácter más", () => {
    expect(sanitizeText("a".repeat(MAX_TEXT_LENGTH)).ok).toBe(true);
    expect(sanitizeText("a".repeat(MAX_TEXT_LENGTH + 1))).toEqual({ ok: false, reason: "too-long" });
  });

  it("el largo cuenta caracteres Unicode, no unidades UTF-16 (un emoji cuenta 1)", () => {
    expect(sanitizeText("😀".repeat(MAX_TEXT_LENGTH)).ok).toBe(true);
    expect(sanitizeText("😀".repeat(MAX_TEXT_LENGTH + 1)).ok).toBe(false);
  });

  it("el largo se mide después de colapsar espacios", () => {
    const text = `a${" ".repeat(500)}b`;
    expect(sanitizeText(text)).toEqual({ ok: true, value: "a b" });
  });
});

describe("hasControlChars / codePointLength", () => {
  it("detecta caracteres de control", () => {
    expect(hasControlChars("hola")).toBe(false);
    expect(hasControlChars("ho\u0000la")).toBe(true);
  });

  it("codePointLength cuenta puntos de código", () => {
    expect(codePointLength("a😀b")).toBe(3);
    expect("a😀b".length).toBe(4);
  });
});
