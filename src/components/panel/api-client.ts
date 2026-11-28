export interface ApiIssue {
  path: string;
  message: string;
}

/** Error de la API con el mensaje en español que ya viene listo para mostrar. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Llama a la API interna con la cookie de sesión y cuerpo JSON; lanza ApiError si la respuesta no es exitosa. */
export async function api<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = options.body !== undefined;
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; code?: string; issues?: ApiIssue[] }
    | null;
  if (!response.ok) {
    throw new ApiError(response.status, payload?.error ?? "Ocurrió un error inesperado. Intenta de nuevo.", payload?.code, payload?.issues ?? []);
  }
  return payload as T;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado. Intenta de nuevo.";
}
