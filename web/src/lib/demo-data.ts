import type { Category, Paginated, Product } from "@/lib/types";

/** Demo catalog — Oʻzbek nomlari, narxlar soʻmda (UZS). */
const CAT_VEG = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const CAT_DAIRY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";
const CAT_BREAD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3";

export function isDemoDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_DATA === "true";
}

export const demoAuthCredentials = {
  email: "demo@bazarplus.uz",
  password: "DemoParol2024!",
} as const;

export const demoRegisterDefaults = {
  name: "Aziza Karimova",
  email: "demo@bazarplus.uz",
  password: "DemoParol2024!",
} as const;

export const DEMO_CATEGORIES: Category[] = [
  {
    id: CAT_VEG,
    name: "Sabzavotlar",
    slug: "sabzavotlar",
  },
  {
    id: CAT_DAIRY,
    name: "Sut mahsulotlari",
    slug: "sut",
  },
  {
    id: CAT_BREAD,
    name: "Non va bugʻdoy",
    slug: "non",
  },
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    name: "Pomidor (1 kg)",
    description: "Yangi mahalliy pomidor.",
    price: "18000",
    stock: 40,
    imageUrl: null,
    categoryId: CAT_VEG,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc2",
    name: "Bodring (1 kg)",
    description: "Salat va turshu uchun.",
    price: "12000",
    stock: 35,
    imageUrl: null,
    categoryId: CAT_VEG,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
    name: "Kartoshka (2 kg)",
    description: "Sariq kartoshka.",
    price: "16000",
    stock: 60,
    imageUrl: null,
    categoryId: CAT_VEG,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc4",
    name: "Sut 3.2% (1 l)",
    description: "Pasterizatsiyalangan sut.",
    price: "14000",
    stock: 25,
    imageUrl: null,
    categoryId: CAT_DAIRY,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc5",
    name: "Qatiq (400 g)",
    description: "Tabiiy qatiq.",
    price: "9000",
    stock: 30,
    imageUrl: null,
    categoryId: CAT_DAIRY,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc6",
    name: "Tuxum (10 dona)",
    description: "Kategoriya A.",
    price: "22000",
    stock: 20,
    imageUrl: null,
    categoryId: CAT_DAIRY,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc7",
    name: "Non (800 g)",
    description: "Issiq non.",
    price: "7000",
    stock: 45,
    imageUrl: null,
    categoryId: CAT_BREAD,
  },
  {
    id: "cccccccc-cccc-4ccc-8ccc-ccccccccccc8",
    name: "Lavash (5 dona)",
    description: "Choʻziluvchi lavash.",
    price: "15000",
    stock: 18,
    imageUrl: null,
    categoryId: CAT_BREAD,
  },
];

export function getDemoCategories(): Category[] {
  return DEMO_CATEGORIES;
}

export function getDemoPopularProducts(): Product[] {
  return DEMO_PRODUCTS;
}

export function getDemoProductsPage(
  page: number,
  limit: number,
  categoryId?: string | null,
): Paginated<Product> {
  const filtered = categoryId
    ? DEMO_PRODUCTS.filter((p) => p.categoryId === categoryId)
    : DEMO_PRODUCTS;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  const items = filtered.slice(start, start + limit);
  return {
    items,
    meta: {
      total,
      page: safePage,
      limit,
      totalPages,
    },
  };
}

export function getDemoProductById(id: string): Product | undefined {
  return DEMO_PRODUCTS.find((p) => p.id === id);
}
