import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import HeroBanner from "@/components/HeroBanner";
import Navbar from "@/components/Navbar";
import CartDrawer from "@/components/CartDrawer";
import argentinaHome from "@/assets/argentina-home.webp";
import argentinaHomeDetail from "@/assets/argentina-home-detail.webp";
import argentinaHomeBack from "@/assets/argentina-home-back.webp";
import argentinaHomeExtra from "@/assets/argentina-home-extra.jpg";
import bocaHome from "@/assets/boca-home-front.webp";
import bocaHomeDetail from "@/assets/boca-home-detail-v2.webp";
import bocaHomeBack from "@/assets/boca-home-back-v2.webp";
import bocaHomeExtra from "@/assets/boca-home-extra.webp";
import { Shield, Truck, Star, MessageCircle, CheckCircle2, CreditCard, Package, ShoppingCart, MapPin } from "lucide-react";

const products = [
  {
    name: "Argentina Titular",
    type: "CAMISETA TITULAR — INCLUYE PARCHE CAMPEÓN DEL MUNDO",
    price: 1,
    images: [argentinaHome, argentinaHomeDetail, argentinaHomeExtra, argentinaHomeBack],
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    name: "Boca JRS Titular",
    type: "CAMISETA TITULAR — INCLUYE PARCHE COPA LIBERTADORES",
    price: 65000,
    images: [bocaHomeDetail, bocaHome, bocaHomeBack, bocaHomeExtra],
    sizes: ["M", "L", "XL", "XXL"],
    playerName: "Paredes",
    playerNumber: "5",
    badgeText: "Libertadores 2026",
  },
];

const features = [
  { icon: Star, title: "Calidad Premium", desc: "Telas importadas, terminaciones idénticas a la original" },
  { icon: Shield, title: "Garantía Total", desc: "No te gusta? Te devolvemos tu plata sin vueltas" },
  { icon: Truck, title: "Envíos con Correo Argentino", desc: "Enviamos a todo el país por Correo Argentino" },
  { icon: CreditCard, title: "MERCADOPAGO", desc: "Pagá online seguro o por transferencia" },
];

const highlights = [
  "Versión Jugador",
  "Calce Slim Fit deportivo",
  "Tela liviana, suave y respirable",
  "Réplica exacta a la original",
  "Logo y escudo termosellados",
  "Etiqueta y packaging incluido",
];

const steps = [
  { num: "01", icon: Star, title: "Elegí tu camiseta", desc: "Argentina o Boca, vos decidís" },
  { num: "02", icon: Package, title: "Seleccioná el talle", desc: "M, L, XL o XXL disponibles" },
  { num: "03", icon: ShoppingCart, title: "Agregá al carrito", desc: "Podés llevar las dos si querés" },
  { num: "04", icon: MapPin, title: "Elegí tu localidad", desc: "Seleccioná provincia y tipo de envío" },
  { num: "05", icon: CreditCard, title: "Pagá con MercadoPago", desc: "Checkout seguro y al instante" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WHATSAPP_NUMBER = "5491125549473";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />
      <HeroBanner />

      <div className="bg-primary/10 border-y border-primary/20 py-3">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-heading uppercase tracking-wider text-primary font-semibold">
            🔥 Últimas unidades disponibles — 1 por talle — No te quedes sin la tuya 🔥
          </p>
        </div>
      </div>

      <section id="productos" className="container mx-auto px-4 py-20 md:py-28">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="text-center mb-14 space-y-3">
          <p className="text-primary font-heading uppercase tracking-[0.3em] text-sm font-semibold">Colección</p>
          <h2 className="font-heading text-4xl md:text-5xl font-bold uppercase text-foreground">Elegí tu camiseta</h2>
          <p className="text-muted-foreground max-w-md mx-auto">Argentina y Boca, las dos son una obra de arte. Deslizá las fotos para ver todos los detalles.</p>
        </motion.div>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
          {products.map((product, i) => (
            <motion.div key={product.name} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.2 }} className="h-full flex">
              <ProductCard {...product} />
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-card border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 space-y-3">
            <p className="text-accent font-heading uppercase tracking-[0.3em] text-sm font-semibold">Simple</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase text-foreground">¿Cómo comprar?</h2>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
            {steps.map((step) => (
              <motion.div key={step.num} variants={itemVariants} className="text-center space-y-3">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-sm uppercase tracking-wider font-bold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 space-y-3">
          <p className="text-primary font-heading uppercase tracking-[0.3em] text-sm font-semibold">Detalles</p>
          <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase text-foreground">Calidad que se nota</h2>
        </motion.div>
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {highlights.map((item) => (
            <motion.div key={item} variants={itemVariants} className="flex items-center gap-3 rounded-xl bg-card border border-border px-4 py-3.5 hover:border-primary/30 transition-colors">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm text-foreground font-medium">{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="envios" className="bg-card border-y border-border">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12 space-y-3">
            <p className="text-accent font-heading uppercase tracking-[0.3em] text-sm font-semibold">Entregas</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase text-foreground">Envíos a todo el país</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Despachamos por Correo Argentino a todo el país. Consultanos por WhatsApp para cualquier duda sobre el envío.</p>
          </motion.div>
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex flex-col md:flex-row gap-6 max-w-2xl mx-auto justify-center">
            {[
              { zone: "CABA / GBA", time: "1 a 5 días hábiles", icon: MapPin, accent: "from-primary/20 to-primary/5" },
              { zone: "Interior del país", time: "2 a 9 días hábiles", icon: Truck, accent: "from-accent/20 to-accent/5" },
            ].map((item) => (
              <motion.div key={item.zone} variants={itemVariants} className="relative overflow-hidden rounded-2xl bg-secondary/50 p-6 text-center space-y-3 group hover:scale-[1.03] transition-transform duration-300 flex-1">
                <div className={`absolute inset-0 bg-gradient-to-br ${item.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <item.icon className="mx-auto h-8 w-8 text-primary mb-2" />
                  <h3 className="font-heading text-lg font-bold uppercase text-foreground">{item.zone}</h3>
                  <p className="text-sm text-muted-foreground">{item.time}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16 md:py-20">
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {features.map((f) => (
            <motion.div key={f.title} variants={itemVariants} className="text-center space-y-3 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors">
              <f.icon className="mx-auto h-8 w-8 text-primary" />
              <h3 className="font-heading text-sm uppercase tracking-wider font-bold text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="contacto" className="bg-card border-t border-border">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center space-y-6 max-w-md mx-auto">
            <p className="text-primary font-heading uppercase tracking-[0.3em] text-sm font-semibold">Contacto</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold uppercase text-foreground">¿Tenés dudas?</h2>
            <p className="text-muted-foreground">Escribinos por WhatsApp y te respondemos al toque.</p>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hola! Quiero consultar sobre las camisetas 🏟️")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(142,71%,45%)] px-6 py-3 font-heading uppercase tracking-wider text-sm font-bold text-foreground hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="h-5 w-5" />
              Escribinos por WhatsApp
            </a>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ProKitARG — Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
