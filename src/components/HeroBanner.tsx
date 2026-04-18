import { motion } from "framer-motion";
import { ChevronDown, Star, Flame } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const HeroBanner = () => {
  const scrollToProducts = () => {
    document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden flex items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroBanner}
          alt="Camisetas de fútbol premium"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6"
        >
          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-5 py-2"
          >
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-accent text-sm font-semibold font-heading uppercase tracking-wider">
              Edición Mundial 2026 — Stock Limitado
            </span>
            <Flame className="h-4 w-4 text-accent" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="font-heading text-5xl sm:text-6xl md:text-8xl font-bold uppercase leading-[0.9] tracking-tight"
          >
            <span className="text-gradient">Camisetas</span>
            <br />
            <span className="text-foreground">RÉPLICA PREMIUM</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-muted-foreground text-base md:text-lg max-w-md mx-auto leading-relaxed"
          >
            Modelos exclusivos en calidad versión jugador.
            <br />
            Máximo nivel de detalle y terminación profesional.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="flex items-center justify-center gap-6 pt-2"
          >
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-accent text-accent" />
              ))}
            </div>
            <span className="text-muted-foreground text-sm">Calidad garantizada</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="pt-4"
          >
            <button
              onClick={scrollToProducts}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-heading text-primary-foreground uppercase tracking-wider text-sm font-bold hover:bg-primary/90 transition-all duration-300 hover:scale-105"
            >
              Ver Camisetas
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroBanner;
