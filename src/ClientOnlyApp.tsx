import { useLayoutEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import App from "./App";

/**
 * BrowserRouter (react-router-dom) requiere `window`, por lo que no puede correr
 * durante SSR de TanStack Start. Renderizamos la app solo después de hidratar.
 *
 * Usamos useLayoutEffect para que el switch a `mounted=true` ocurra antes del
 * primer paint del navegador, evitando un flash del placeholder.
 */
export function ClientOnlyApp() {
  const [mounted, setMounted] = useState(false);
  const location = useRouterState({
    select: (state) => state.location,
  });

  const fallbackScreen = useMemo(() => {
    const pathname = location.pathname;
    const params = new URLSearchParams(location.search);
    const rawStatus = (params.get("status") || params.get("collection_status") || "").toLowerCase();
    const paymentId = params.get("payment_id") || params.get("collection_id");

    if (pathname === "/payment-success") {
      const isApproved = ["approved", "authorized"].includes(rawStatus) || Boolean(paymentId);
      const isPending = ["pending", "in_process", "in_mediation"].includes(rawStatus);

      if (isApproved) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>

              <div className="space-y-3">
                <h1 className="font-heading text-3xl font-bold uppercase text-foreground">
                  ¡Pago aprobado!
                </h1>
                <p className="text-muted-foreground">
                  Estamos cargando la confirmación de tu compra para que veas el detalle en pantalla.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 text-left">
                <div className="flex items-center gap-3 text-sm text-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Finalizando la carga de tu comprobante…</span>
                </div>
                {paymentId && (
                  <p className="pt-3 text-xs text-muted-foreground">
                    ID de pago: {paymentId}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      }

      if (isPending) {
        return (
          <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-6">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                <Clock className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-3">
                <h1 className="font-heading text-3xl font-bold uppercase text-foreground">
                  Estamos revisando tu pago
                </h1>
                <p className="text-muted-foreground">
                  En unos instantes vas a ver el estado actualizado de tu compra.
                </p>
              </div>
            </div>
          </div>
        );
      }
    }

    if (pathname === "/payment-failure") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-3">
              <h1 className="font-heading text-3xl font-bold uppercase text-foreground">
                Cargando estado del pago
              </h1>
              <p className="text-muted-foreground">
                Estamos preparando la información para mostrarte qué pasó con tu intento de pago.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando tienda…</p>
        </div>
      </div>
    );
  }, [location.pathname, location.search]);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallbackScreen;
  }

  return <App />;
}
