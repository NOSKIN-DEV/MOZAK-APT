/**
 * Límite de intentos de inicio de sesión (Etapa 15).
 *
 * Tras MAX_ATTEMPTS fallos para una misma clave (dirección + correo) dentro de
 * la ventana, se bloquea por el tiempo que reste de ella. Un inicio de sesión
 * correcto borra el contador.
 *
 * LIMITACIÓN: vive en la memoria del servidor. En una sola instancia protege
 * contra la fuerza bruta simple; con varias instancias (por ejemplo Vercel)
 * cada una lleva su propia cuenta, así que sería necesario moverlo a la base
 * de datos o a un servicio externo antes de un uso real.
 */
export class LoginThrottle {
  private readonly attempts = new Map<string, { count: number; first: number }>();

  constructor(
    private readonly maxAttempts: number = 5,
    private readonly windowMs: number = 15 * 60 * 1000,
  ) {}

  /** Segundos que faltan para poder reintentar, o 0 si no está bloqueado. */
  retryAfterSeconds(key: string, now: number = Date.now()): number {
    const entry = this.attempts.get(key);
    if (!entry) {
      return 0;
    }
    if (now - entry.first >= this.windowMs) {
      this.attempts.delete(key);
      return 0;
    }
    if (entry.count < this.maxAttempts) {
      return 0;
    }
    return Math.ceil((entry.first + this.windowMs - now) / 1000);
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const entry = this.attempts.get(key);
    if (!entry || now - entry.first >= this.windowMs) {
      this.attempts.set(key, { count: 1, first: now });
      return;
    }
    entry.count += 1;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
