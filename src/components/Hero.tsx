import type { ReactNode } from "react";

interface HeroProps {
  children?: ReactNode;
}

export function Hero({ children }: HeroProps) {
  return (
    <section className="border-b border-gray-200 bg-gradient-to-b from-green-50 to-white px-4 py-12 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Descubre qué hacer cerca de ti
        </h1>
        <p className="max-w-xl text-gray-600">
          Encuentra eventos, cultura y entretenimiento según tu ubicación, fecha y preferencias.
        </p>
        {children && <div className="mt-2 w-full max-w-xl">{children}</div>}
      </div>
    </section>
  );
}
