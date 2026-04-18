import { useState, useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft, Package, MessageCircle, Loader2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

interface VerifyResponse {
  status: string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  order_verified: boolean;
  currency_valid: boolean;
  amount_valid: boolean;
  already_processed: boolean;
  error?: string;
}

const PAYMENTS_API_URL = "https://wepyjpvcaxzuzzzwtglo.supabase.co";

const verifyPayment = async (paymentId: string): Promise<VerifyResponse> => {
  const res = await fetch(
    `${PAYMENTS_API_URL}/functions/v1/verify-payment?payment_id=${encodeURIComponent(paymentId)}`
  );

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Error al verificar el pago (${res.status}): ${errorBody}`);
  }

  return res.json();
};

const WHATSAPP_NUMBER = "5491125549473";

const WhatsAppLink = ({ text, label }: { text: string; label: string }) => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-3 font-heading text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-green-500 transition-colors"
  >
    <MessageCircle className="h-5 w-5" />
    {label}
  </a>
);

const BackToStoreButton = ({ navigate }: { navigate: ReturnType<typeof useNavigate> }) => (
  <Button variant="ghost" onClick={() => navigate("/")}>
    <ArrowLeft className="h-4 w-4 mr-2" />
    Volver a la tienda
  </Button>
);

const INITIAL_DELAY = 3000;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000;

const getRedirectStatus = (searchParams: URLSearchParams, hasPaymentId: boolean) => {
  const rawStatus = (searchParams.get("status") || searchParams.get("collection_status") || "").toLowerCase();

  if (["approved", "authorized"].includes(rawStatus)) return "approved";
  if (["pending", "in_process", "in_mediation"].includes(rawStatus)) return "pending";
  if (rawStatus) return rawStatus;

  return hasPaymentId ? "approved" : null;
};

const createFallbackResponse = (status: string): VerifyResponse => ({
  status,
  status_detail: "redirect_fallback",
  external_reference: "",
  transaction_amount: 0,
  currency_id: "ARS",
  order_verified: false,
  currency_valid: true,
  amount_valid: true,
  already_processed: false,
});

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
  const redirectStatus = getRedirectStatus(searchParams, Boolean(paymentId));
  const clearedRef = useRef(false);
  const orderUpdatedRef = useRef(false);

  const [data, setData] = useState<VerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [usedRedirectFallback, setUsedRedirectFallback] = useState(false);
  const [usedApprovedFallback, setUsedApprovedFallback] = useState(false);

  // Update order payment_status to "paid" when payment is approved
  const updateOrderStatus = useCallback(async (externalReference: string) => {
    if (orderUpdatedRef.current || !externalReference) return;
    orderUpdatedRef.current = true;

    // Wait for auth session to be restored after MercadoPago redirect
    const maxSessionRetries = 5;
    let session = null;
    for (let i = 0; i < maxSessionRetries; i++) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        session = sessionData.session;
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!session) {
      console.error("No auth session available to update order status");
      orderUpdatedRef.current = false;
      return;
    }

    // Try updating via direct client call
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: "paid" as string, payment_id: paymentId as string | null })
        .eq("id", externalReference)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Client update failed, trying edge function:", error);
        // Fallback: call edge function to update server-side
        try {
          await fetch(`${PAYMENTS_API_URL}/functions/v1/verify-payment?payment_id=${encodeURIComponent(paymentId!)}&update_order=true`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          console.log("Order status update requested via edge function");
        } catch (fetchErr) {
          console.error("Edge function fallback also failed:", fetchErr);
        }
        orderUpdatedRef.current = false;
      } else {
        console.log("Order status updated to paid successfully");
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      orderUpdatedRef.current = false;
    }
  }, [paymentId]);

  const doVerify = useCallback(async (pid: string, attempt: number) => {
    try {
      const result = await verifyPayment(pid);
      const hasValidationMismatch = result.currency_valid === false || result.amount_valid === false;

      if (result.status === "approved" && !hasValidationMismatch) {
        setData(result);
        setUsedApprovedFallback(result.order_verified !== true && result.already_processed !== true);
        setIsLoading(false);
        // Update order status in DB
        if (result.external_reference) {
          updateOrderStatus(result.external_reference);
        }
        return;
      }
      
      if (result.status === "pending" && attempt < MAX_RETRIES) {
        setRetryCount(attempt + 1);
        setTimeout(() => doVerify(pid, attempt + 1), RETRY_DELAY);
        return;
      }

      if (result.status === "approved" && !result.order_verified && !result.already_processed && attempt < MAX_RETRIES) {
        setRetryCount(attempt + 1);
        setTimeout(() => doVerify(pid, attempt + 1), RETRY_DELAY);
        return;
      }

      setData(result);
      setIsLoading(false);
      // If approved even with retries exhausted, update order
      if (result.status === "approved" && result.external_reference) {
        updateOrderStatus(result.external_reference);
      }
    } catch {
      if (attempt < MAX_RETRIES) {
        setRetryCount(attempt + 1);
        setTimeout(() => doVerify(pid, attempt + 1), RETRY_DELAY);
        return;
      }

      if (redirectStatus) {
        setData(createFallbackResponse(redirectStatus));
        setUsedRedirectFallback(true);
        setIsLoading(false);
        return;
      }

      setIsError(true);
      setIsLoading(false);
    }
  }, [redirectStatus, updateOrderStatus]);

  useEffect(() => {
    if (!paymentId) {
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      doVerify(paymentId, 0);
    }, INITIAL_DELAY);

    return () => clearTimeout(timer);
  }, [paymentId, doVerify]);

  const isFullyApproved = data?.status === "approved" && (
    data?.order_verified === true ||
    data?.already_processed === true ||
    usedRedirectFallback ||
    usedApprovedFallback
  );
  const hasVerificationMismatch = data?.currency_valid === false || data?.amount_valid === false;
  const isApprovedButUnverified = data?.status === "approved" && data?.order_verified === false && !data?.already_processed && hasVerificationMismatch;
  const isPending = data?.status === "pending";
  const isRejected = data && data.status !== "approved" && data.status !== "pending";

  useEffect(() => {
    if (isFullyApproved && !clearedRef.current) {
      clearedRef.current = true;
      clearCart();
    }
  }, [isFullyApproved, clearCart]);

  // Also try to update order via external_reference from URL if redirect says approved
  useEffect(() => {
    if (isFullyApproved && !orderUpdatedRef.current) {
      const extRef = searchParams.get("external_reference");
      if (extRef) {
        updateOrderStatus(extRef);
      }
    }
  }, [isFullyApproved, searchParams, updateOrderStatus]);

  if (!paymentId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="font-heading text-2xl font-bold uppercase text-foreground">
            Enlace inválido
          </h1>
          <p className="text-muted-foreground">
            No se encontró información del pago en la URL.
          </p>
          <BackToStoreButton navigate={navigate} />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
          <h1 className="font-heading text-2xl font-bold uppercase text-foreground">
            Verificando tu pago...
          </h1>
          <p className="text-muted-foreground">
            Estamos confirmando tu transacción con MercadoPago. Esto solo toma unos segundos.
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Intento {retryCount + 1} de {MAX_RETRIES + 1}...
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  if (isApprovedButUnverified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
          <h1 className="font-heading text-2xl font-bold uppercase text-foreground">
            Pago recibido — verificación pendiente
          </h1>
          <p className="text-muted-foreground">
            Tu pago fue procesado por MercadoPago, pero necesitamos verificar los detalles de tu orden.
            Contactanos por WhatsApp para confirmar.
          </p>
          {data?.currency_valid === false && (
            <p className="text-xs text-destructive">
              La moneda del pago no coincide con la esperada.
            </p>
          )}
          {data?.amount_valid === false && (
            <p className="text-xs text-destructive">
              El monto del pago no coincide con tu orden.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            ID de pago: {paymentId}
          </p>
          <div className="flex flex-col items-center gap-2 pt-4">
            <WhatsAppLink
              text={`Hola! Mi pago fue aprobado pero necesita verificación. ID: ${paymentId}`}
              label="Contactar por WhatsApp"
            />
            <BackToStoreButton navigate={navigate} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (isError || isRejected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <XCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="font-heading text-2xl font-bold uppercase text-foreground">
            Pago no aprobado
          </h1>
          <p className="text-muted-foreground">
            {data?.status_detail
              ? `Estado: ${data.status} — ${data.status_detail}`
              : "No pudimos verificar tu pago. Si creés que es un error, contactanos."}
          </p>
          <div className="flex flex-col items-center gap-2 pt-4">
            <WhatsAppLink
              text={`Hola! Tuve un problema con mi pago. ID: ${paymentId}`}
              label="Contactar por WhatsApp"
            />
            <BackToStoreButton navigate={navigate} />
          </div>
        </motion.div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <Clock className="h-16 w-16 text-yellow-500 mx-auto" />
          <h1 className="font-heading text-2xl font-bold uppercase text-foreground">
            Pago pendiente
          </h1>
          <p className="text-muted-foreground">
            Tu pago está siendo procesado por MercadoPago. Te vamos a avisar cuando se confirme.
          </p>
          <p className="text-xs text-muted-foreground">
            ID de pago: {paymentId}
          </p>
          <div className="flex flex-col items-center gap-2 pt-4">
            <WhatsAppLink
              text={`Hola! Mi pago está pendiente. ID: ${paymentId}`}
              label="Consultar por WhatsApp"
            />
            <BackToStoreButton navigate={navigate} />
          </div>
        </motion.div>
      </div>
    );
  }

  // Approved
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="max-w-md w-full text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto w-24 h-24 rounded-full bg-green-600/20 border-2 border-green-600 flex items-center justify-center"
        >
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h1 className="font-heading text-3xl md:text-4xl font-bold uppercase text-foreground">
            ¡Gracias por tu compra! 🎉
          </h1>
          <p className="text-muted-foreground">
            Tu pedido fue recibido correctamente y ya estamos procesándolo.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-4 pt-4"
        >
          <div className="rounded-xl bg-card border border-border p-4 space-y-3 text-left">
            <div className="flex items-start gap-2 text-sm text-foreground">
              <Package className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span>Podés seguir el estado de tu pedido en cualquier momento desde tu perfil.</span>
            </div>
            <p className="text-xs text-muted-foreground">
              A medida que avancemos (preparación, envío, etc), se va a ir actualizando automáticamente.
            </p>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
              ID de pago: {paymentId}
            </p>
          </div>

          <Link
            to="/perfil"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-heading text-sm font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Package className="h-5 w-5" />
            Ver mis pedidos
          </Link>

          <WhatsAppLink
            text={`Hola! Acabo de realizar una compra. ID de pago: ${paymentId}. Tengo una consulta.`}
            label="¿Tenés alguna consulta?"
          />

          <div className="pt-2">
            <BackToStoreButton navigate={navigate} />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
