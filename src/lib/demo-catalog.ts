// Inventra AI — the demo catalog, mirrored from samples/inventra-demo.csv.
// Embedded so the one-click "Load demo data" action and the seed script work in
// every runtime (dev, standalone build) with no filesystem access.

import type { ImportRow } from "./types";

export const DEMO_FILE_NAME = "inventra-demo.csv";

export const DEMO_CATALOG: ImportRow[] = [
  {
    "name": "Coca-Cola 330ml Can",
    "category": "Beverage",
    "stock": 84,
    "dailySales": 42,
    "sellingPrice": 0.6,
    "costPrice": 0.42
  },
  {
    "name": "Pepsi 330ml Can",
    "category": "Beverage",
    "stock": 510,
    "dailySales": 30,
    "sellingPrice": 0.55,
    "costPrice": 0.38
  },
  {
    "name": "Sprite 1.5L",
    "category": "Beverage",
    "stock": 190,
    "dailySales": 11,
    "sellingPrice": 1.2,
    "costPrice": 0.85
  },
  {
    "name": "Red Bull 250ml",
    "category": "Beverage",
    "stock": 58,
    "dailySales": 26,
    "sellingPrice": 1,
    "costPrice": 0.7
  },
  {
    "name": "Vital Drinking Water 500ml",
    "category": "Water",
    "stock": 430,
    "dailySales": 60,
    "sellingPrice": 0.25,
    "costPrice": 0.14
  },
  {
    "name": "Vital Drinking Water 1.5L",
    "category": "Water",
    "stock": 900,
    "dailySales": 18,
    "sellingPrice": 0.45,
    "costPrice": 0.28
  },
  {
    "name": "Dasani Water 600ml",
    "category": "Water",
    "stock": 1500,
    "dailySales": 9,
    "sellingPrice": 0.3,
    "costPrice": 0.19
  },
  {
    "name": "MAMA Instant Noodles Pork",
    "category": "Instant Noodles",
    "stock": 470,
    "dailySales": 38,
    "sellingPrice": 0.3,
    "costPrice": 0.19
  },
  {
    "name": "MAMA Instant Noodles Shrimp",
    "category": "Instant Noodles",
    "stock": 60,
    "dailySales": 22,
    "sellingPrice": 0.3,
    "costPrice": 0.19
  },
  {
    "name": "YumYum Instant Noodles Chicken",
    "category": "Instant Noodles",
    "stock": 1450,
    "dailySales": 0.8,
    "sellingPrice": 0.28,
    "costPrice": 0.18
  },
  {
    "name": "Nescafe 3-in-1 Sachet",
    "category": "Coffee & Tea",
    "stock": 940,
    "dailySales": 55,
    "sellingPrice": 0.22,
    "costPrice": 0.14
  },
  {
    "name": "Nescafe Gold Jar 100g",
    "category": "Coffee & Tea",
    "stock": 120,
    "dailySales": 3.5,
    "sellingPrice": 7.5,
    "costPrice": 5.8
  },
  {
    "name": "Lipton Yellow Label 25s",
    "category": "Coffee & Tea",
    "stock": 88,
    "dailySales": 3,
    "sellingPrice": 2.4,
    "costPrice": 1.7
  },
  {
    "name": "Lay's Classic 40g",
    "category": "Snacks",
    "stock": 320,
    "dailySales": 24,
    "sellingPrice": 0.75,
    "costPrice": 0.5
  },
  {
    "name": "Pringles Original 107g",
    "category": "Snacks",
    "stock": 120,
    "dailySales": 6,
    "sellingPrice": 2.5,
    "costPrice": 1.8
  },
  {
    "name": "Oishi Prawn Crackers 60g",
    "category": "Snacks",
    "stock": 540,
    "dailySales": 1.5,
    "sellingPrice": 0.6,
    "costPrice": 0.4
  },
  {
    "name": "Snickers 50g",
    "category": "Confectionery",
    "stock": 300,
    "dailySales": 18,
    "sellingPrice": 0.7,
    "costPrice": 0.47
  },
  {
    "name": "KitKat 4-Finger",
    "category": "Confectionery",
    "stock": 240,
    "dailySales": 13,
    "sellingPrice": 0.8,
    "costPrice": 0.55
  },
  {
    "name": "Mentos Mint Roll",
    "category": "Confectionery",
    "stock": 700,
    "dailySales": 0.6,
    "sellingPrice": 0.35,
    "costPrice": 0.22
  },
  {
    "name": "Dutch Lady UHT Milk 1L",
    "category": "Dairy",
    "stock": 52,
    "dailySales": 15,
    "sellingPrice": 1.6,
    "costPrice": 1.2
  },
  {
    "name": "Nestle Bear Brand 140ml",
    "category": "Dairy",
    "stock": 340,
    "dailySales": 17,
    "sellingPrice": 0.65,
    "costPrice": 0.45
  },
  {
    "name": "Anchor Butter 227g",
    "category": "Dairy",
    "stock": 60,
    "dailySales": 2,
    "sellingPrice": 4.2,
    "costPrice": 3.3
  },
  {
    "name": "Cooking Oil 1L Pouch",
    "category": "Cooking",
    "stock": 340,
    "dailySales": 9,
    "sellingPrice": 2.4,
    "costPrice": 1.95
  },
  {
    "name": "Cooking Oil 5L Jerrycan",
    "category": "Cooking",
    "stock": 90,
    "dailySales": 3,
    "sellingPrice": 10.5,
    "costPrice": 8.8
  },
  {
    "name": "Fish Sauce 700ml",
    "category": "Cooking",
    "stock": 240,
    "dailySales": 7,
    "sellingPrice": 1.3,
    "costPrice": 0.95
  },
  {
    "name": "Soy Sauce 500ml",
    "category": "Cooking",
    "stock": 300,
    "dailySales": 5,
    "sellingPrice": 0.9,
    "costPrice": 0.6
  },
  {
    "name": "Jasmine Rice 25kg",
    "category": "Canned & Packaged",
    "stock": 34,
    "dailySales": 4,
    "sellingPrice": 22,
    "costPrice": 18.5
  },
  {
    "name": "Jasmine Rice 5kg",
    "category": "Canned & Packaged",
    "stock": 320,
    "dailySales": 9,
    "sellingPrice": 6.5,
    "costPrice": 5.2
  },
  {
    "name": "Canned Sardines 155g",
    "category": "Canned & Packaged",
    "stock": 240,
    "dailySales": 0.7,
    "sellingPrice": 0.95,
    "costPrice": 0.65
  },
  {
    "name": "Sunsilk Shampoo Sachet 5ml",
    "category": "Personal Care",
    "stock": 1200,
    "dailySales": 70,
    "sellingPrice": 0.12,
    "costPrice": 0.07
  },
  {
    "name": "Head & Shoulders 170ml",
    "category": "Personal Care",
    "stock": 120,
    "dailySales": 4,
    "sellingPrice": 3.6,
    "costPrice": 2.7
  },
  {
    "name": "Colgate Toothpaste 150g",
    "category": "Personal Care",
    "stock": 260,
    "dailySales": 6,
    "sellingPrice": 1.8,
    "costPrice": 1.25
  },
  {
    "name": "Lifebuoy Soap Bar 100g",
    "category": "Personal Care",
    "stock": 420,
    "dailySales": 14,
    "sellingPrice": 0.55,
    "costPrice": 0.36
  },
  {
    "name": "Whisper Sanitary Pads 8s",
    "category": "Personal Care",
    "stock": 150,
    "dailySales": 5,
    "sellingPrice": 1.4,
    "costPrice": 0.98
  },
  {
    "name": "Pampers Diapers M 4s",
    "category": "Baby Care",
    "stock": 42,
    "dailySales": 5,
    "sellingPrice": 2.8,
    "costPrice": 2.1
  },
  {
    "name": "Dettol Antiseptic 250ml",
    "category": "Household",
    "stock": 140,
    "dailySales": 0.4,
    "sellingPrice": 3.2,
    "costPrice": 2.4
  },
  {
    "name": "Downy Fabric Softener Sachet",
    "category": "Household",
    "stock": 900,
    "dailySales": 1.2,
    "sellingPrice": 0.2,
    "costPrice": 0.12
  },
  {
    "name": "Scotch-Brite Sponge 2s",
    "category": "Household",
    "stock": 220,
    "dailySales": 4,
    "sellingPrice": 0.75,
    "costPrice": 0.45
  }
];
