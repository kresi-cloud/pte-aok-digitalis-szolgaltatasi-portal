import { USERS } from "./seed";

/** Demóban kiemelten felkínált felhasználók (ebben a sorrendben elöl). */
const PREFERRED_ORDER = [
  "u-kovacs",
  "u-szabo",
  "u-fekete",
  "u-varga",
  "u-toth",
  "u-nagy",
  "u-horvath",
  "u-nemeth",
  "u-molnar",
  "u-dekan",
  "u-beszerzo",
  "u-eszkozmgr",
  "u-gazdvez",
  "u-itref",
];

/**
 * Minden felhasználó választható a demóban, hogy a folyamat egyetlen
 * lépése se akadjon el amiatt, hogy a soron következő döntéshozó nevében
 * nem lehet belépni.
 */
export const DEMO_USER_IDS: string[] = [
  ...PREFERRED_ORDER.filter((id) => USERS.some((u) => u.id === id)),
  ...USERS.map((u) => u.id).filter((id) => !PREFERRED_ORDER.includes(id)),
];
