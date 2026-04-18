import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useCart } from "@/context/CartContext";
import SizeGuideDialog from "@/components/SizeGuideDialog";

interface ProductCardProps {
  name: string;
  type: string;
  price: number;
  images: string[];
  sizes: string[];
  playerName?: string;
  playerNumber?: string;
  badgeText?: string;
}


const ProductCard = ({ name, type, price, images, sizes, playerName = "Messi", playerNumber = "10", badgeText = "Mundial 2026" }: ProductCardProps) => {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const { addItem } = useCart();

  const formattedPrice = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(price);

  const handleAddToCart = () => {
    if (!selectedSize) return;
    addItem({ name, type, size: selectedSize, price, image: images[0] });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const goPrev = () => setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  const goNext = () => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    goPrev();
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    goNext();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const distance = touchStartX - touchEndX;
    const threshold = 50;
    if (distance > threshold) goNext();
    else if (distance < -threshold) goPrev();
    setTouchStartX(null);
    setTouchEndX(null);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className="group rounded-2xl bg-card border border-border overflow-hidden hover:border-primary/30 transition-colors duration-500 w-full flex flex-col"
    >
      <div
        className="relative overflow-hidden bg-background touch-pan-y select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={currentImage}
            src={images[currentImage]}
            alt={`${name} - imagen ${currentImage + 1}`}
            className="w-full aspect-square object-cover"
            width={800}
            height={960}
            loading="lazy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        </AnimatePresence>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setCurrentImage(i); }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentImage
                      ? "bg-primary w-5"
                      : "bg-foreground/30 hover:bg-foreground/50"
                  }`}
                  aria-label={`Ver imagen ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground font-heading uppercase tracking-wider text-xs">
          {badgeText}
        </Badge>
        <div className="absolute top-4 right-4">
          <Badge variant="outline" className="bg-background/70 backdrop-blur-sm border-primary/30 text-primary font-heading text-xs">
            Versión Jugador
          </Badge>
        </div>
      </div>

      <div className="p-6 space-y-5 flex-1 flex flex-col">
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-[0.2em]">
            {type}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <h3 className="font-heading text-2xl font-bold text-foreground">
              {name}
            </h3>
            <div className="shrink-0 rounded-lg bg-primary text-primary-foreground px-2 py-1 text-center leading-tight">
              <span className="font-heading text-[9px] font-bold uppercase tracking-wider block">{playerName}</span>
              <span className="font-heading text-sm font-bold block -mt-0.5">{playerNumber}</span>
            </div>
          </div>
        </div>


        <div className="flex items-baseline flex-wrap gap-3">
          <p className="font-heading text-3xl font-bold text-primary">
            {formattedPrice}
          </p>
          <p className="text-sm text-muted-foreground line-through">
            {new Intl.NumberFormat("es-AR", {
              style: "currency",
              currency: "ARS",
              minimumFractionDigits: 0,
            }).format(price * 1.4)}
          </p>
          <Badge className="bg-destructive/20 text-destructive border-none text-xs font-bold">
            -30%
          </Badge>
          <SizeGuideDialog />
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">Seleccioná tu talle</p>
          <div className="flex gap-2">
            {sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                  selectedSize === size
                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                    : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.button
            key={justAdded ? "added" : "add"}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleAddToCart}
            disabled={!selectedSize || justAdded}
            className={`w-full py-4 rounded-xl mt-auto font-heading text-base uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 ${
              justAdded
                ? "bg-green-600 text-white"
                : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-5 w-5" />
                Agregado al carrito
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5" />
                Agregar al carrito
              </>
            )}
          </motion.button>
        </AnimatePresence>

        <div className="flex items-center gap-2 justify-center">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">
            Stock limitado — 1 por talle
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
