import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client-original";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { User, Loader2, ArrowLeft } from "lucide-react";

const CustomerAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("email not confirmed")) {
        setError("Tu email todavía no está confirmado. Revisá tu casilla y luego iniciá sesión.");
      } else {
        setError("Email o contraseña incorrectos");
      }
      setLoading(false);
      return;
    }

    navigate(from);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signUpData.session) {
      navigate(from);
      return;
    }

    setSuccess("Te enviamos un email de confirmación. Confirmalo para poder iniciar sesión.");
    setIsRegister(false);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-8"
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Volver a la tienda</span>
        </button>

        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-heading text-2xl font-bold uppercase text-foreground">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister
              ? "Registrate para guardar tus pedidos y hacer seguimiento"
              : "Accedé a tu cuenta para ver tus pedidos"}
          </p>
        </div>

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="bg-secondary border-border"
              required
            />
          </div>
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              className="bg-secondary border-border"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-500 text-center">{success}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-heading uppercase tracking-wider font-bold"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRegister ? (
              "Crear cuenta"
            ) : (
              "Iniciar sesión"
            )}
          </Button>
        </form>

        <div className="text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
              setSuccess("");
            }}
            className="text-sm text-primary hover:underline"
          >
            {isRegister
              ? "¿Ya tenés cuenta? Iniciá sesión"
              : "¿No tenés cuenta? Registrate"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomerAuth;
