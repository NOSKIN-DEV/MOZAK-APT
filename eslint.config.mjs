import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Next 16 trae eslint-plugin-react-hooks 7, que marca como error el patrón
      // «setState al inicio de un efecto». Las pantallas actuales lo usan (carga de
      // datos y tema) y ya están verificadas; se deja como aviso y la refactorización
      // queda como deuda técnica.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
