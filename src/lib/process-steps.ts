/**
 * Az eszközbeszerzés egyetlen, központi nyolclépcsős folyamatmodellje.
 * Minden felület (igény adatlap, munkaterek, demóvezérlő, összegzők) ebből
 * a modulból veszi a lépésneveket és a lépésindexet – a státuszértelmezés
 * sehol máshol nem duplikálódik.
 */
export const PROCESS_STEPS = [
  "Igénylés",
  "Szervezeti jóváhagyás",
  "IT besorolás",
  "Gazdasági jóváhagyás",
  "Beszerzés",
  "Konfigurálás",
  "Eszközátadás",
  "Átvétel és lezárás",
] as const;

export type ProcessStepLabel = (typeof PROCESS_STEPS)[number];

export const PROCESS_STEP_COUNT = PROCESS_STEPS.length;

/** Lépésindexek olvasható néven (0-alapú). */
export const STEP = {
  igenyles: 0,
  szervezeti_jovahagyas: 1,
  it_besorolas: 2,
  gazdasagi_jovahagyas: 3,
  beszerzes: 4,
  konfiguralas: 5,
  eszkozatadas: 6,
  atvetel: 7,
} as const;
