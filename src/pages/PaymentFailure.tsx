import { motion } from "framer-motion";
import { XCircle, ArrowLeft, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "5491125549473";

const PaymentFailure = () => {
  const navigate = useNavigate();

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
          className="mx-auto w-24 h-24 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center"
        >
          <XCircle className="h-12 w-12 text-destructive" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h1 className="font-heading text-3xl md:text-4xl font-bold uppercase text-foreground">
            Pago no procesado
          </h1>
          <p className="text-muted-foreground">
            Hubo un problema con tu pago. No te preocupes, podés intentar de nuevo o escribirnos por WhatsApp.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-3 pt-4"
        >
          <Button
            onClick={() => navigate("/checkout")}
            className="w-full h-12 rounded-xl font-heading uppercase tracking-wider font-bold"
          >
            Intentar de nuevo
          </Button>

          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Tuve un problema con mi pago")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Necesito ayuda por WhatsApp
          </a>

          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la tienda
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PaymentFailure;
