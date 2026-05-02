/**
 * UI strings — Oʻzbek (Latin). Single locale for the storefront.
 */
export const uz = {
  meta: {
    title: "BazarPlus — oziq-ovqat yetkazib berish",
    description:
      "Yangi mahsulotlarni uyga tez va qulay yetkazib beramiz.",
  },
  nav: {
    brand: "BazarPlus",
    shop: "Doʻkon",
    categories: "Kategoriyalar",
    cart: "Savat",
    orders: "Buyurtmalar",
    profile: "Profil",
    home: "Bosh sahifa",
    signIn: "Kirish",
    cartAria: "Savat",
    profileAria: "Profil",
  },
  home: {
    categoriesTitle: "Kategoriyalar",
    popularPicks: "Mashhur tanlovlar",
    searchResults: "Qidiruv natijalari",
    noProductsSearch: "Qidiruvingizga mos mahsulot topilmadi.",
  },
  search: {
    placeholder: "Mahsulot qidirish…",
    ariaLabel: "Mahsulotlarni qidirish",
  },
  products: {
    all: "Hammasi",
    loadingMore: "Yana yuklanmoqda…",
    emptyCategory: "Bu kategoriyada mahsulot yoʻq.",
  },
  categoriesPage: {
    title: "Kategoriyalar",
  },
  product: {
    noImage: "Rasm yoʻq",
    inStock: (n: number) => `${n} ta qoldi`,
    outOfStock: "Tugagan",
    add: "Savatga",
    addedToast: "Savatga qoʻshildi",
    backToShop: "← Doʻkonga qaytish",
    available: (n: number) => `${n} ta mavjud`,
    outOfStockLong: "Hozirda omborda yoʻq",
    addToCart: "Savatga qoʻshish",
  },
  cart: {
    title: "Savat",
    empty: "Savatingiz boʻsh.",
    browse: "Mahsulotlarni koʻrish",
    subtotal: "Jami",
    checkout: "Buyurtma berish",
    each: "bittasi",
    decrease: "Kamaytirish",
    increase: "Oshirish",
    remove: "Olib tashlash",
  },
  auth: {
    backToStore: "← Doʻkonga qaytish",
    loginTitle: "Kirish",
    loginSubtitle: "BazarPlusga xush kelibsiz",
    email: "Email",
    password: "Parol",
    signIn: "Kirish",
    signingIn: "Kirilmoqda…",
    noAccount: "Hisobingiz yoʻqmi?",
    register: "Roʻyxatdan oʻtish",
    loading: "Yuklanmoqda…",
    createTitle: "Hisob yaratish",
    createSubtitle: "Tez roʻyxatdan oʻting — xaridni boshlang",
    nameOptional: "Ism (ixtiyoriy)",
    registerBtn: "Roʻyxatdan oʻtish",
    creating: "Yaratilmoqda…",
    hasAccount: "Hisobingiz bormi?",
  },
  validation: {
    required: "Majburiy maydon",
    passwordMin8: "Kamida 8 ta belgi",
    selectAddress: "Manzilni tanlang",
  },
  profile: {
    title: "Profil",
    loading: "Profil yuklanmoqda…",
    account: "Hisob",
    name: "Ism",
    phone: "Telefon",
    saveProfile: "Saqlash",
    addresses: "Manzillar",
    noAddresses: "Hozircha manzil yoʻq.",
    addAddressTitle: "Manzil qoʻshish",
    labelPlaceholder: "Yorliq (ixtiyoriy)",
    line1Placeholder: "Koʻcha, uy",
    line2Placeholder: "Qavat, eshik (ixtiyoriy)",
    cityPlaceholder: "Shahar",
    postalPlaceholder: "Pochta indeksi",
    addAddressBtn: "Manzilni saqlash",
    signedOut: "Chiqildi",
    signOut: "Chiqish",
    updated: "Profil yangilandi",
    addressSaved: "Manzil saqlandi",
  },
  orders: {
    title: "Mening buyurtmalarim",
    empty: "Hozircha buyurtma yoʻq.",
    itemCount: (n: number) =>
      `${n} ta mahsulot`,
    detailTitle: "Buyurtma",
    allOrders: "← Barcha buyurtmalar",
    itemsTitle: "Mahsulotlar",
    qty: (n: number) => `Miqdor ${n}`,
  },
  orderStatus: {
    CREATED: "Buyurtma berildi",
    ACCEPTED: "Tasdiqlandi",
    PREPARING: "Tayyorlanmoqda",
    ON_THE_WAY: "Yo‘lda",
    DELIVERED: "Yetkazildi",
  },
  tracking: {
    title: "Jonli kuzatuv",
    courierAt: (lat: string, lng: string) =>
      `Kuryer: ${lat}, ${lng}`,
    courierPending:
      "Kuryer joylashuvi paydo boʻlganda koʻrsatiladi.",
  },
  checkout: {
    title: "Buyurtma berish",
    emptyTitle: "Buyurtma berish uchun savatda mahsulot yoʻq.",
    continueShopping: "Xaridni davom ettirish",
    summary: "Buyurtma xulosasi",
    paymentNote:
      "Toʻlov provayder tasdigʻigacha kutilmoqda.",
    deliveryAddress: "Yetkazib berish manzili",
    loadingAddresses: "Manzillar yuklanmoqda…",
    addAddressHintBefore: "Avval",
    addAddressHintProfile: "Profil",
    addAddressHintAfter: "boʻlimida manzil qoʻshing.",
    selectAddress: "Manzilni tanlang",
    paymentMethod: "Toʻlov usuli",
    payCard: "Karta (buyurtmadan keyin onlayn)",
    payWallet: "Raqamli hamyon",
    payCash: "Yetkazib berishda naqd",
    placeOrder: "Buyurtmani tasdiqlash",
    placing: "Yuborilmoqda…",
    cartEmptyToast: "Savat boʻsh",
    unexpectedToast: "Kutilmagan javob",
    unexpectedDesc:
      "Buyurtma yaratildi, lekin ID topilmadi — «Buyurtmalar»ni tekshiring.",
    successToast: "Buyurtma qabul qilindi",
    successDesc:
      "Holatni kuzating va toʻlovni yakunlang.",
    errorToast: "Buyurtma berilmadi",
  },
  session: {
    checking: "Sessiya tekshirilmoqda…",
  },
  errors: {
    title: "Xatolik yuz berdi",
    generic:
      "Qayta urinib koʻring. Muammo davom etsa, ulanishni tekshiring.",
    devDetail: "Kutilmagan xatolik.",
    routeTitle: "Xatolik yuz berdi",
    routeMessage:
      "Qayta urinib koʻring yoki bosh sahifaga qayting. Xizmat vaqtincha ishlamasligi mumkin.",
    tryAgain: "Qayta urinish",
    home: "Bosh sahifa",
    checkoutTitle: "Buyurtma berish hozir mumkin emas",
    checkoutMessage:
      "Buyurtmani yakunlay olmadik. Savat saqlanadi — onlayn boʻlganda qayta urining.",
    ordersTitle: "Buyurtmalar yuklanmadi",
    ordersMessage:
      "Buyurtmalar roʻyxatini olishda muammo. Internetni tekshirib, qayta urining.",
    productTitle: "Mahsulot ochilmadi",
    productMessage:
      "Mahsulot sahifasini yuklashda xatolik. Orqaga qayting yoki qayta urining.",
  },
  api: {
    timeout: "Soʻrov vaqti tugadi.",
    offline:
      "Serverga ulanib boʻlmadi. Internetni tekshirib, qayta urining.",
    generic: "Nimadir xato ketdi.",
  },
  connectionToast: {
    title: "Ulanish muammosi",
    retrying: "Soʻrov qayta yuborilmoqda…",
  },
} as const;

export function formatOrderStatus(status: string): string {
  const key = status as keyof typeof uz.orderStatus;
  if (key in uz.orderStatus) return uz.orderStatus[key];
  return status.replace(/_/g, " ");
}
