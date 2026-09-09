'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type LazyMountProps = {
  children: ReactNode;
  /** Contenido de reserva mientras no es visible (placeholder con altura para evitar CLS). */
  fallback?: ReactNode;
  /** Margen alrededor del viewport para precargar antes de llegar. */
  rootMargin?: string;
};

/**
 * Monta `children` solo cuando el contenedor está a punto de entrar en el
 * viewport (IntersectionObserver). Se usa para diferir la hidratación de los
 * módulos pesados ("Planes del día", "Consejos", patrocinio, tendencia semanal)
 * que están al final de la home, de modo que no bloqueen la carga inicial
 * (TBT/INP). Si IntersectionObserver no está disponible, monta de inmediato.
 */
export function LazyMount({ children, fallback = null, rootMargin = '220px' }: LazyMountProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return <div ref={ref}>{visible ? children : fallback}</div>;
}