import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ruler } from "lucide-react";

const sizeData = [
  { label: "M", chest: "45 - 47", length: "70 - 72" },
  { label: "L", chest: "47 - 49", length: "72 - 74" },
  { label: "XL", chest: "49 - 51", length: "74 - 76" },
  { label: "XXL", chest: "51 - 53", length: "76 - 78" },
];

const SizeGuideDialog = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-sm text-blue-500 hover:text-blue-400 underline underline-offset-2 transition-colors flex items-center gap-1">
          <Ruler className="h-3.5 w-3.5" />
          Guía de talles
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider text-foreground">
            Guía de talles
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Medidas en centímetros (cm)
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="px-4 py-3 text-left font-heading text-xs uppercase tracking-wider text-muted-foreground">
                    Talla de la etiqueta
                  </th>
                  <th className="px-4 py-3 text-center font-heading text-xs uppercase tracking-wider text-muted-foreground">
                    Ancho de pecho
                  </th>
                  <th className="px-4 py-3 text-center font-heading text-xs uppercase tracking-wider text-muted-foreground">
                    Largo de prenda
                  </th>
                </tr>
              </thead>
              <tbody>
                {sizeData.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-t border-border ${i % 2 === 0 ? "bg-background" : "bg-secondary/50"}`}
                  >
                    <td className="px-4 py-3 font-semibold text-foreground text-center">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.chest}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">
                      {row.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SizeGuideDialog;
