import argentinaHome from "@/assets/argentina-home.webp";
import argentinaHomeDetail from "@/assets/argentina-home-detail.webp";
import argentinaHomeBack from "@/assets/argentina-home-back.webp";
import argentinaHomeExtra from "@/assets/argentina-home-extra.jpg";
import bocaHome from "@/assets/boca-home-front.webp";
import bocaHomeDetail from "@/assets/boca-home-detail-v2.webp";
import bocaHomeFrontNew from "@/assets/boca-home-front-new.png";
import bocaHomeBackNew from "@/assets/boca-home-back-new.png";

export interface Product {
  productKey: string;
  name: string;
  type: string;
  price: number;
  images: string[];
  sizes: string[];
  playerName?: string;
  playerNumber?: string;
  badgeText?: string;
}

export const products: Product[] = [
  {
    productKey: "argentina-titular",
    name: "Argentina Titular",
    type: "CAMISETA TITULAR — INCLUYE PARCHE CAMPEÓN DEL MUNDO",
    price: 1,
    images: [argentinaHome, argentinaHomeDetail, argentinaHomeExtra, argentinaHomeBack],
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    productKey: "boca-titular",
    name: "Boca JRS Titular",
    type: "CAMISETA TITULAR — INCLUYE PARCHE COPA LIBERTADORES",
    price: 65000,
    images: [bocaHomeDetail, bocaHome, bocaHomeFrontNew, bocaHomeBackNew],
    sizes: ["M", "L", "XL", "XXL"],
    playerName: "Paredes",
    playerNumber: "5",
    badgeText: "Libertadores 2026",
  },
];
