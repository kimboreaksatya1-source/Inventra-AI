// Inventra AI — seeded product intelligence for recognition.
// Local-first: most rows resolve here in milliseconds with no AI call.

export const CATEGORIES = [
  "Beverage",
  "Water",
  "Instant Noodles",
  "Dairy",
  "Snacks",
  "Personal Care",
  "Household",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** SKU prefixes per category. */
export const CATEGORY_CODES: Record<Category, string> = {
  Beverage: "BEV",
  Water: "WTR",
  "Instant Noodles": "NDL",
  Dairy: "DRY",
  Snacks: "SNK",
  "Personal Care": "PCR",
  Household: "HHD",
  Other: "GEN",
};

export interface KbProduct {
  name: string; // canonical name
  brand: string;
  category: Category;
  aliases?: string[];
}

export const KB_PRODUCTS: KbProduct[] = [
  // Beverages
  { name: "Coca-Cola Original 330ml", brand: "Coca-Cola", category: "Beverage", aliases: ["coca cola 330", "coke 330", "coca-cola 330ml", "coca cola 330ml", "កូកាកូឡា 330ml", "កូកា 330"] },
  { name: "Coca-Cola Original 500ml", brand: "Coca-Cola", category: "Beverage", aliases: ["coca cola 500", "coke 500", "coca-cola 500ml"] },
  { name: "Coca-Cola Zero", brand: "Coca-Cola", category: "Beverage", aliases: ["coke zero", "coca cola zero", "coca-cola zero sugar"] },
  { name: "Pepsi 330ml", brand: "Pepsi", category: "Beverage", aliases: ["pepsi 330", "pepsi cola 330ml", "ប៉ិបស៊ី 330ml", "ប៉ិបស៊ី"] },
  { name: "Pepsi Black", brand: "Pepsi", category: "Beverage", aliases: ["pepsi black", "pepsi zero"] },
  { name: "Sprite 330ml", brand: "Sprite", category: "Beverage", aliases: ["sprite", "sprite can"] },
  { name: "Fanta Orange 330ml", brand: "Fanta", category: "Beverage", aliases: ["fanta orange", "fanta"] },
  { name: "Pocari Sweat 500ml", brand: "Pocari Sweat", category: "Beverage", aliases: ["pocari sweat", "pocari"] },
  { name: "Red Bull", brand: "Red Bull", category: "Beverage", aliases: ["red bull energy", "redbull"] },
  { name: "Carabao", brand: "Carabao", category: "Beverage", aliases: ["carabao energy", "carabao daeng"] },
  { name: "Sting Strawberry", brand: "Sting", category: "Beverage", aliases: ["sting red", "sting strawberry energy"] },
  { name: "Sting Gold", brand: "Sting", category: "Beverage", aliases: ["sting gold energy", "sting yellow"] },

  // Water
  { name: "Vital Water 500ml", brand: "Vital", category: "Water", aliases: ["vital 500", "vital 500ml", "vital water 500", "ទឹកសុទ្ធ vital 500ml", "ទឹក vital 500"] },
  { name: "Vital Water 1500ml", brand: "Vital", category: "Water", aliases: ["vital 1500", "vital 1.5l", "vital water 1.5"] },
  { name: "Dasani Water 500ml", brand: "Dasani", category: "Water", aliases: ["dasani", "dasani 500ml", "dasani water"] },

  // Instant Noodles
  { name: "Buldak Carbonara", brand: "Samyang", category: "Instant Noodles", aliases: ["buldak carbonara", "samyang carbonara", "carbonara buldak"] },
  { name: "Buldak Original", brand: "Samyang", category: "Instant Noodles", aliases: ["buldak", "buldak original", "samyang hot chicken", "buldak hot chicken"] },
  { name: "Mama Shrimp", brand: "Mama", category: "Instant Noodles", aliases: ["mama shrimp", "mama tom yum shrimp", "mama prawn", "មីម៉ាម៉ា បង្គា", "ម៉ាម៉ា បង្គា"] },
  { name: "Mama Pork", brand: "Mama", category: "Instant Noodles", aliases: ["mama pork", "mama minced pork"] },
  { name: "Mi Chiet Beef", brand: "Mi Chiet", category: "Instant Noodles", aliases: ["mi chiet beef", "mee chiet beef", "michiet beef", "មីជាតិ សាច់គោ", "មីជាតិសាច់គោ"] },
  { name: "Mi Chiet Chicken", brand: "Mi Chiet", category: "Instant Noodles", aliases: ["mi chiet chicken", "mee chiet chicken", "michiet chicken", "មីជាតិ សាច់មាន់", "មីជាតិសាច់មាន់"] },
  { name: "Indomie Mi Goreng", brand: "Indomie", category: "Instant Noodles", aliases: ["indomie mi goreng", "indomie goreng", "mi goreng"] },
  { name: "ABC Chicken", brand: "ABC", category: "Instant Noodles", aliases: ["abc chicken", "abc mie chicken"] },
  { name: "Koka Chicken", brand: "Koka", category: "Instant Noodles", aliases: ["koka chicken", "koka noodles chicken"] },

  // Dairy
  { name: "Anchor Milk 1L", brand: "Anchor", category: "Dairy", aliases: ["anchor milk", "anchor 1l", "anchor uht milk"] },
  { name: "Dutch Mill", brand: "Dutch Mill", category: "Dairy", aliases: ["dutch mill", "dutchmill", "dutch mill yogurt drink"] },
  { name: "Meiji Milk", brand: "Meiji", category: "Dairy", aliases: ["meiji milk", "meiji fresh milk"] },
  { name: "Bear Brand", brand: "Bear Brand", category: "Dairy", aliases: ["bear brand", "bear brand milk", "nestle bear brand"] },

  // Snacks
  { name: "Lay's Original", brand: "Lay's", category: "Snacks", aliases: ["lays original", "lay's classic", "lays classic"] },
  { name: "Lay's BBQ", brand: "Lay's", category: "Snacks", aliases: ["lays bbq", "lay's barbecue"] },
  { name: "Pringles Original", brand: "Pringles", category: "Snacks", aliases: ["pringles original", "pringles classic"] },
  { name: "Pringles Sour Cream", brand: "Pringles", category: "Snacks", aliases: ["pringles sour cream", "pringles sour cream and onion"] },
  { name: "Oishi Prawn Crackers", brand: "Oishi", category: "Snacks", aliases: ["oishi prawn crackers", "oishi prawn", "oishi"] },
  { name: "Roller Coaster", brand: "Roller Coaster", category: "Snacks", aliases: ["roller coaster", "rollercoaster snack"] },

  // Personal Care
  { name: "Colgate Total", brand: "Colgate", category: "Personal Care", aliases: ["colgate total", "colgate toothpaste"] },
  { name: "Closeup Red Hot", brand: "Closeup", category: "Personal Care", aliases: ["closeup red hot", "close up red hot", "closeup toothpaste"] },
  { name: "Pantene Shampoo", brand: "Pantene", category: "Personal Care", aliases: ["pantene shampoo", "pantene"] },
  { name: "Sunsilk Black Shine", brand: "Sunsilk", category: "Personal Care", aliases: ["sunsilk black shine", "sunsilk shampoo"] },
  { name: "Head & Shoulders", brand: "Head & Shoulders", category: "Personal Care", aliases: ["head and shoulders", "h&s shampoo", "head & shoulders shampoo"] },
  { name: "Lux Soap", brand: "Lux", category: "Personal Care", aliases: ["lux soap", "lux bar soap"] },
  { name: "Safeguard Soap", brand: "Safeguard", category: "Personal Care", aliases: ["safeguard soap", "safeguard bar"] },

  // Household
  { name: "Tide Detergent", brand: "Tide", category: "Household", aliases: ["tide detergent", "tide powder", "tide washing powder"] },
  { name: "Ariel Detergent", brand: "Ariel", category: "Household", aliases: ["ariel detergent", "ariel powder", "ariel washing powder"] },
  { name: "Downy", brand: "Downy", category: "Household", aliases: ["downy", "downy fabric softener"] },
  { name: "Sunlight Dishwashing Liquid", brand: "Sunlight", category: "Household", aliases: ["sunlight dishwashing liquid", "sunlight dish soap", "sunlight lemon"] },
  { name: "Scotch-Brite Sponge", brand: "Scotch-Brite", category: "Household", aliases: ["scotch brite sponge", "scotch-brite", "scotchbrite scrub"] },
];

/** Known brands — from the KB plus common Cambodian minimart brands. */
export const KNOWN_BRANDS: string[] = Array.from(
  new Set([
    ...KB_PRODUCTS.map((p) => p.brand),
    "Nissin",
    "Yum Yum",
    "Nestlé",
    "Nescafé",
    "Milo",
    "Ovaltine",
    "Dutch Lady",
    "Vinamilk",
    "Angkor",
    "Cambodia",
    "Hanuman",
    "Ganzberg",
    "Chang",
    "Heineken",
    "Tiger",
    "Aquafina",
    "Kirin",
    "Number One",
    "Mirinda",
    "7 Up",
    "Sprite",
    "Lipton",
    "Sunkist",
    "Marlboro",
    "ARA",
    "Kokomo",
  ])
);

/** Keyword → category. First match wins; order matters (specific before general). */
export const CATEGORY_KEYWORDS: [Category, string[]][] = [
  ["Water", ["water", "aqua", "mineral water", "drinking water", "ទឹក"]],
  ["Instant Noodles", ["noodle", "ramen", "instant mi", "mi goreng", "cup noodle", "carbonara", "buldak", "mama", "indomie", "koka", "មី"]],
  ["Dairy", ["milk", "yogurt", "yoghurt", "cheese", "cream", "condensed milk", "uht", "ទឹកដោះគោ"]],
  ["Personal Care", ["shampoo", "soap", "toothpaste", "toothbrush", "lotion", "deodorant", "conditioner", "sanitary", "razor", "face wash"]],
  ["Household", ["detergent", "washing powder", "dishwash", "dish soap", "fabric softener", "bleach", "sponge", "cleaner", "tissue", "toilet paper", "trash bag"]],
  ["Snacks", ["chips", "crackers", "biscuit", "cookie", "snack", "wafer", "candy", "chocolate", "gum", "nuts", "popcorn", "pringles", "lay"]],
  ["Beverage", ["cola", "coke", "pepsi", "soda", "juice", "tea", "coffee", "energy drink", "energy", "soft drink", "sprite", "fanta", "red bull", "sting", "carabao", "beer", "drink", "ភេសជ្ជៈ"]],
];
