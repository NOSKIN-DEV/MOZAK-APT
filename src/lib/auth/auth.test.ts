import { describe, expect, it } from "vitest";
import { LoginThrottle } from "./login-throttle";
import { checkPasswordPolicy, hashPassword, verifyPassword } from "./password";
import {
  SESSION_TTL_SECONDS,
  createSessionToken,
  resolveSessionSecret,
  verifySessionToken,
} from "./session";
import {
  isSecureRequest,
  readCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
} from "./cookies";

const SECRET = "x".repeat(40);

describe("contraseñas (scrypt)", () => {
  it("el hash no contiene la contraseña y la verificación acepta la correcta", async () => {
    const hash = await hashPassword("una-clave-larga-123");
    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(hash.includes("una-clave-larga-123")).toBe(false);
    expect(await verifyPassword("una-clave-larga-123", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("una-clave-larga-123");
    expect(await verifyPassword("otra-clave-larga-123", hash)).toBe(false);
  });

  it("dos hashes de la misma contraseña son distintos (sal aleatoria)", async () => {
    const [a, b] = await Promise.all([hashPassword("misma-clave-12345"), hashPassword("misma-clave-12345")]);
    expect(a === b).toBe(false);
  });

  it("un hash mal formado devuelve false, no lanza un error", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$1$2$3$4$5")).toBe(false);
    expect(await verifyPassword("x", "scrypt$no$es$un$hash$valido")).toBe(false);
    expect(await verifyPassword("x", "scrypt$16384$8$1$$")).toBe(false);
    // parámetro de costo desmesurado (podría agotar la memoria): se rechaza sin calcular
    expect(await verifyPassword("x", "scrypt$1073741824$8$1$c2Fs$a2V5")).toBe(false);
  });

  it("la política exige entre 10 y 128 caracteres y no solo espacios", () => {
    expect(checkPasswordPolicy("corta").ok).toBe(false);
    expect(checkPasswordPolicy("x".repeat(129)).ok).toBe(false);
    expect(checkPasswordPolicy(" ".repeat(12)).ok).toBe(false);
    expect(checkPasswordPolicy("una-clave-valida").ok).toBe(true);
  });
});

describe("token de sesión", () => {
  const now = new Date("2026-11-23T12:00:00Z");

  it("un token recién emitido devuelve el id del usuario", () => {
    const token = createSessionToken("user-1", SECRET, now);
    expect(verifySessionToken(token, SECRET, now)).toBe("user-1");
  });

  it("vence a las 8 horas", () => {
    const token = createSessionToken("user-1", SECRET, now);
    const almost = new Date(now.getTime() + (SESSION_TTL_SECONDS - 1) * 1000);
    const expired = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
    expect(verifySessionToken(token, SECRET, almost)).toBe("user-1");
    expect(verifySessionToken(token, SECRET, expired)).toBeNull();
  });

  it("se rechaza con otro secreto, o si se altera el contenido o la firma", () => {
    const token = createSessionToken("user-1", SECRET, now);
    expect(verifySessionToken(token, "y".repeat(40), now)).toBeNull();

    const [body, signature] = token.split(".") as [string, string];
    const forgedBody = Buffer.from(JSON.stringify({ sub: "admin", iat: 0, exp: 9999999999 })).toString("base64url");
    expect(verifySessionToken(`${forgedBody}.${signature}`, SECRET, now)).toBeNull();
    expect(verifySessionToken(`${body}.${signature.slice(0, -2)}AA`, SECRET, now)).toBeNull();
  });

  it("textos que no son un token se rechazan sin error", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "..", "e30.e30"]) {
      expect(verifySessionToken(bad, SECRET, now)).toBeNull();
    }
  });

  it("exige un secreto de al menos 32 caracteres y avisa, pero no falla, cuando no está definido", () => {
    expect(() => resolveSessionSecret("corto")).toThrow(/SESSION_SECRET/);
    expect(resolveSessionSecret(SECRET)).toBe(SECRET);
    expect(resolveSessionSecret("").length).toBeGreaterThanOrEqual(32);
  });
});

describe("cookies", () => {
  it("lee una cookie entre varias", () => {
    expect(readCookie("a=1; mozak_session=abc.def; b=2", "mozak_session")).toBe("abc.def");
    expect(readCookie("a=1", "mozak_session")).toBeNull();
    expect(readCookie(null, "mozak_session")).toBeNull();
    expect(readCookie("mozak_session=%E0%A4%A", "mozak_session")).toBeNull();
  });

  it("la cookie de sesión es HttpOnly y SameSite=Lax; Secure solo bajo https", () => {
    const plain = serializeSessionCookie("tok", { secure: false });
    expect(plain).toMatch(/HttpOnly/);
    expect(plain).toMatch(/SameSite=Lax/);
    expect(plain).toMatch(/Path=\//);
    expect(plain.includes("Secure")).toBe(false);
    expect(serializeSessionCookie("tok", { secure: true })).toMatch(/; Secure$/);
  });

  it("la cookie para cerrar sesión vence de inmediato", () => {
    expect(serializeClearedSessionCookie({ secure: false })).toMatch(/Max-Age=0/);
  });

  it("detecta https directo o a través de un proxy", () => {
    expect(isSecureRequest(new Request("https://mozak.example/api"))).toBe(true);
    expect(isSecureRequest(new Request("http://localhost:3000/api"))).toBe(false);
    expect(isSecureRequest(new Request("http://localhost:3000/api", { headers: { "x-forwarded-proto": "https" } }))).toBe(true);
  });
});

describe("LoginThrottle", () => {
  it("bloquea tras 5 fallos y se libera al terminar la ventana", () => {
    const throttle = new LoginThrottle(5, 60_000);
    const t0 = 1_000_000;
    for (let i = 0; i < 4; i++) throttle.recordFailure("k", t0);
    expect(throttle.retryAfterSeconds("k", t0)).toBe(0);
    throttle.recordFailure("k", t0);
    expect(throttle.retryAfterSeconds("k", t0)).toBe(60);
    expect(throttle.retryAfterSeconds("k", t0 + 59_000)).toBe(1);
    expect(throttle.retryAfterSeconds("k", t0 + 60_000)).toBe(0);
  });

  it("las claves son independientes y un acceso correcto borra el contador", () => {
    const throttle = new LoginThrottle(2, 60_000);
    throttle.recordFailure("a", 0);
    throttle.recordFailure("a", 0);
    expect(throttle.retryAfterSeconds("a", 0)).toBeGreaterThan(0);
    expect(throttle.retryAfterSeconds("b", 0)).toBe(0);
    throttle.reset("a");
    expect(throttle.retryAfterSeconds("a", 0)).toBe(0);
  });
});
