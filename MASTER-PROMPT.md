# MASTER PROMPT — PTE ÁOK Digitális Szolgáltatási Portál (DSZP)

> Ez a dokumentum a jelenlegi fejlesztési verzió teljes, újraépíthető leírása.
> Egyetlen promptként átadva a rendszer funkcionálisan azonos módon reprodukálható.
> Állapot: 2026. augusztus 20. — kattintható, teljes körű prototípus (mock adatokkal, backend nélkül).

---

## 1. TERMÉK

Építs egy belső intézményi digitális szolgáltatásmenedzsment-portált a Pécsi Tudományegyetem Általános Orvostudományi Kara (PTE ÁOK) számára.

- Termék neve: **ÁOK Digitális Szolgáltatási Portál (DSZP)**
- Alcím: „Digitális és informatikai igények egy helyen”
- Alap nyelv: **magyar**, teljes **angol** felülettel (nyelvváltó a fejlécben)
- Központi üzenet: „Egy belépési pont a digitális igényeknek. Átlátható folyamatok. Tiszta felelősségek. Mérhető szolgáltatásminőség.”

Vezérelv: az alkalmazás NEM ticketrendszer. A felhasználó azt írja le, **mit szeretne elérni**; a szervezeti besorolást, felelőst, jóváhagyási utat és beszerzési következményt a rendszer állítja elő a háttérben.

## 2. TECHNOLÓGIAI ALAP

- TanStack Start v1 (React 19, Vite 7), fájlalapú routing a `src/routes` alatt
- Tailwind CSS v4 `src/styles.css`-ben definiált szemantikus tokenekkel, shadcn/ui komponensek
- Recharts a diagramokhoz, lucide-react ikonok
- **Nincs backend**: minden adat determinisztikus seed + React context store (`src/lib/store.tsx`), `localStorage` perzisztenciával, `resetDemo()` visszaállítással
- Csak olvasható MCP-szerver (`src/lib/mcp/`) a demóadatok agent-hozzáféréséhez

## 3. VIZUÁLIS NYELV (aok.pte.hu-ihletésű)

- Világos, intézményi, visszafogott; nincs startup-esztétika, nincs dekoratív gradiens
- Elsődleges szín: mély PTE-navy `oklch(0.298 0.095 265.6)`; akcentus: türkiz `oklch(0.689 0.122 184.4)`; háttér: hideg világosszürke
- Tipográfia: **Poppins** (sans + display), **Playfair Display** kizárólag a wordmarkhoz
- Kártyás, sok fehér területet használó elrendezés, erős információhierarchia, WCAG-tudatos kontraszt, billentyűzetbarát interakció, státusz sosem csak színnel jelölve
- Minden szín, árnyék, gradiens szemantikus token; komponensekben tilos hardcode színosztály

## 4. SZEREPKÖRÖK (9)

| kulcs               | megnevezés              | jogosultság                                                        |
| ------------------- | ----------------------- | ------------------------------------------------------------------ |
| `igenylo`           | Igénylő                 | igény benyújtása, saját ügyek, saját leltár                        |
| `jovahagyo`         | Szervezeti jóváhagyó    | egységének igényei, jóváhagyás/elutasítás/pontosításkérés          |
| `ugyintezo`         | Szolgáltatási ügyintéző | munkatér, besorolás, státusz, belső jegyzet, becslés               |
| `szolgaltatasgazda` | Szolgáltatásgazda       | katalógus, csapatok, SLA, kapacitás, portfólió                     |
| `vezeto`            | Kari vezető             | vezetői áttekintés, teljes rálátás eset szintig                    |
| `dekan`             | Dékán                   | minden vezetői nézet + negyedéves/éves beszerzési terv jóváhagyása |
| `admin`             | Rendszeradminisztrátor  | adminisztráció, leltárjóváhagyás, katalógus, közlemények           |
| `beszerzo`          | Beszerző                | jóváhagyott eseti beszerzések, negyedéves/éves terv végrehajtása   |
| `superuser`         | Superuser               | **kizárólagos** jogosultság-kiosztás, teljes szerepkör-audit       |

Belépés: szimulált intézményi SSO („Belépés PTE azonosítóval”), demo felhasználó-választóval; a rendszer ismeri a nevet, e-mailt, szervezeti egységet, beosztást, munkavállalói azonosítót és a felettest. Aktív szerepkör futásidőben váltható a profilmenüből.

## 5. NAVIGÁCIÓ (szerepkörfüggő)

`/` Kezdőlap · `/uj-igeny` Új igény · `/igenyeim` Igényeim · `/leltar` Személyi leltár · `/eszkozkataszter` Eszközkataszter · `/beszerzesek` Beszerzői munkatér · `/beszerzesi-terv` Beszerzési terv · `/eletciklus-elorejelzes` Életciklus-előrejelzés · `/szolgaltatasok` Szolgáltatások · `/fejlesztesek` Fejlesztések · `/jovahagyasok` Jóváhagyási sor · `/munkater` Szolgáltatási munkatér · `/portfolio` Fejlesztési portfólió · `/vezetoi-attekintes` Vezetői áttekintés · `/felelossegek` Szolgáltatások és felelősségek · `/adminisztracio` Adminisztráció · `/jogosultsagok` Jogosultságkezelés · `/segitseg` Segítség · `/igeny/$id` · `/eszkoz/$id` · `/profil`

Minden menüpont szerepkör-szűrt; jogosulatlan belépéskor a route saját „hozzáférés megtagadva” blokkot mutat (ez a szöveg mindig látható marad).

Fejléc: wordmark → globális kereső („Keresés szolgáltatások, igények és projektek között…”) → értesítési harang → **nyelvváltó** → felhasználói gomb. A fejlécben nincs külön zöld „+ Új igény” CTA (a menüpont fedi le).

## 6. KEZDŐLAP

Nincs üdvözlő hero-banner. Sorrend:

1. **Hírek** blokk — csak akkor jelenik meg, ha van érvényes, mindenkinek szóló közlemény (rendszeradminisztrátor hozza létre, lejárati idővel, fontossági szinttel, elvethetően)
2. Négy szolgáltatási domain kártya: **Szoftver, Hardver, Honlap és webes megjelenés, Szolgáltatásdigitalizáció és fejlesztés**
3. „Folyamatban lévő igényeim” — azonosító, cím, státusz, felelős csapat, utolsó frissítés
4. „Teendőim” — pontosításra váró, jóváhagyandó, átvételre váró tételek
5. Személyi eszközök gyorsnézete

## 7. IGÉNYINDÍTÓ VARÁZSLÓ (`/uj-igeny`)

Négy lépés, sosem egy nagy űrlap:

1. **„Miben segíthetünk?”** — domain vagy katalóguselem választása (katalógusból indítva előtöltés)
2. **Cél leírása** — „Írd le röviden, mit szeretnél elérni. Nem szükséges technikai megoldást megadnod.” + „Segíts pontosítani az igényt” gomb (szimulált AI strukturálás, kizárólag javaslatként, a felhasználó erősíti meg)
3. **Kontextusfüggő kérdések** — csak a releváns kérdések (felhasználói kör, létszám, határidő, meglévő rendszer, személyes adat kezelése, integráció, egyszeri vagy tartós, költségkeret)
4. **Összefoglaló** — Cél / Érintett szervezeti egység / Felhasználók / Kívánt eredmény / Határidő / Adatkezelési érintettség / Integráció / Becsült prioritás, szabadon szerkeszthető
   Akciók: „Igény beküldése” és „Mentés piszkozatként”.

## 8. IGÉNYÉRTÉKELÉS (szimulált triage)

Beküldés után a rendszer javaslatot állít elő: szolgáltatási kategória, altípus, felelős csapat, komplexitás, várható workflow, szükséges jóváhagyás, lehetséges duplikáció, projektjelleg.

- Csak szolgáltatási és vezetői szerepköröknek látszik.
- Fejléce mindig: **„Igényértékelés – manuális jóváhagyás szükséges”**; a javaslat sosem hoz automatikus, visszafordíthatatlan döntést.

## 9. STÁTUSZMODELL ÉS IGÉNY RÉSZLETEK

Státuszok: Piszkozat → Beküldve → Első értékelés → Pontosítás szükséges → Jóváhagyásra vár → Elfogadva → Tervezés alatt → Megvalósítás alatt → Tesztelés → Átadásra vár → Lezárva / Elutasítva (nem minden igény jár be minden állapotot).

`/igeny/$id` fejléc: azonosító + cím, státusz, felelős csapat és ügyintéző, igénylő, szervezeti egység, prioritás, beküldés, céldátum, becsült költség, következő lépés.
Fülek: **Áttekintés · Folyamat (vizuális idővonal) · Kommunikáció · Dokumentumok · Kapcsolódó feladatok · Döntések · Előzmények**.
Kommunikáció: „Üzenet az igénylőnek” vs. **„Belső megjegyzés”** — a belső jegyzet az igénylőnek soha nem látszik, de a `vezeto` és `dekan` szerepkör látja.
Az igénylő egyszerűsített nézetet kap; a szolgáltatási oldal ezen felül látja a belső besorolást, ráfordítást, költséghatást, beszerzési, IT-biztonsági, adatvédelmi és integrációs követelményeket.

## 10. JÓVÁHAGYÁSI FOLYAMAT

Workflow-vizualizáció: ki, mikor, mit hagyott jóvá, mi van függőben, mi a következő döntés.
Tipikus utak: szoftverlicenc → igénylő → szervezeti vezető → szolgáltatásgazda; hardver → igénylő → vezető → költségkeret-gazda → IT; digitalizációs fejlesztés → igénylő → szervezeti vezető → szolgáltatásgazda → dékáni hivatal.
`/jovahagyasok`: dedikált jóváhagyási sor (SLA-visszaszámlálás, korosodás, tömeges átnézés). Az `igenylo` szerepkör számára a menüpont nem jelenik meg.

## 11. SZOLGÁLTATÁSI MUNKATÉR (`/munkater`)

KPI-k: Új igények · Pontosításra vár · Jóváhagyás alatt · Megvalósítás alatt · SLA-kockázatos · Lezárt ebben a hónapban.
Interaktív táblázat (Azonosító, Igény, Kategória, Szervezeti egység, Igénylő, Felelős, Prioritás, Státusz, Beküldés, Határidő) szűrőkkel (kategória, státusz, felelős, egység, prioritás, dátum, SLA) és nézetekkel: „Saját ügyeim”, „Új igények”, „Csapat ügyei”, „SLA-kockázat”, „Nagy fejlesztések”. Kapacitásfigyelés csapatonként.

## 12. SZOLGÁLTATÁSKATALÓGUS ÉS FELELŐSSÉGEK

`/szolgaltatasok`: kereshető katalógus (Microsoft 365 hozzáférés, speciális szoftver, új munkaállomás, notebook, monitorcsere, tanszéki honlap módosítása, webes űrlap, dashboard, automatizált workflow, belső alkalmazás, adatgyűjtés, AI-megoldás vizsgálata …). Minden tétel: leírás, ki igényelheti, tipikus átfutás, szükséges jóváhagyások, kért információk, felelős egység, SLA, „Igény indítása” gomb előtöltéssel.
`/felelossegek`: mátrix — Szolgáltatás · Felelős egység · Szolgáltatásgazda · Üzemeltető csapat · Jóváhagyó · Támogató egység · SLA · Eszkalációs felelős (személyfüggetlen felelősség-térkép).

## 13. SZEMÉLYI LELTÁR (`/leltar`)

Minden felhasználó maga rögzíti hardver- és szoftvertételeit; a rendszeradminisztrátor hagyja jóvá (Adminisztráció → Leltár jóváhagyás).

- Modellválasztás után a technikai adatok **automatikusan** kitöltődnek: operációs rendszer és verzió, processzor, memória, tároló, speciális feature-ök (modellkatalógus: Dell, HP, Lenovo, Apple stb.)
- Minden eszköznél kötelezően megjelenik a **szériaszám/gyári szám** és a **PTE leltárkód**
- **Mobilitásfüggő helymeghatározás**: nem mobil eszköz (asztali gép, workstation, nyomtató, laboreszköz) esetén épület + helyiség kötelező; mobil eszköznél „Személyi használat”
- Szoftverlicencek: státusz, felhasználás, „nem használt” jelölés
- Nincs „Eltérés vagy hiba bejelentése” gomb a blokkok alján

## 14. INTÉZMÉNYI ESZKÖZKATASZTER ÉS ÉLETCIKLUS

`/eszkozkataszter`: ~180 demó eszköz, személyi és közös használat, kategóriák, életciklus-státusz (aktív, elöregedő, cserére javasolt, kivezetett), helyszín, felelős, hardverszabvány, referenciaár, finanszírozási forrás.
`/eszkoz/$id`: eszköz-dashboard eseménynaplóval, ellenőrzési válaszokkal, csere-döntéssel.
`/eletciklus-elorejelzes`: többéves (10 év) csereigény- és költség-előrejelzés kategóriánként, 5 éves alapéletciklussal.

## 15. BESZERZÉS

- `/beszerzesi-terv`: következő pénzügyi év (2027) terve; a rendszer automatikusan azonosítja a cserejelölteket életciklus alapján, negyedéves bontással, becsült költséggel
- **Igény → terv kapcsolat**: a jóváhagyott hardver-/szoftverigényből automatikusan beszerzési tervjavaslat keletkezik (kulcsszó → hardverszabvány → referenciaár leképezéssel), „Jóváhagyott igényből” jelöléssel és kétirányú hivatkozással az igény és a terv között
- `/beszerzesek`: beszerzői munkatér — jóváhagyott eseti beszerzések feladatlistája, negyedéves és éves tervek állapota
- **Tervjóváhagyási ciklus**: a negyedéves tervet a dékán az esedékesség előtt **30 nappal**, az éveset **60 nappal** hagyja jóvá; a rendszer számolja a határidőt, jelzi a csúszást, kezeli a „visszaküldve” állapotot

## 16. FEJLESZTÉSI PORTFÓLIÓ (`/portfolio`, `/fejlesztesek`)

Az egyszerű igények és a nagyobb digitalizációs kezdeményezések elkülönítve. Kezdeményezésenként: stratégiai relevancia, gazda, szponzor, felelős csapat, szakasz, várt haszon, becsült költség és ráfordítás, függőségek, céldátum, kockázati státusz.
Szakaszok (kanban): Ötlet → Előszűrés → Koncepció → Prioritási döntés → Tervezés → Fejlesztés → Tesztelés → Bevezetés → Lezárás.

## 17. VEZETŐI ÁTTEKINTÉS (`/vezetoi-attekintes`)

A korábbi dékáni és vezetői nézet **összevonva**, minden dedikált vezetői szerepkörnek elérhető.
Tartalom: havi igénybeérkezés, kategóriánkénti és szervezeti egységenkénti megoszlás, átlagos átfutási idő, SLA-teljesítés, backlog, vezetői döntést igénylő ügyek, fejlesztési portfólió, kapacitás, költség, elkészült fejlesztések, elégedettség.
„Hol vannak jelenleg szűk keresztmetszetek?” blokk **rendszer által generált megállapításokkal**, egyértelműen megjelölve. Bármely mutató **eset szintre lefúrható** egészen az igény részletes oldaláig.

## 18. ADMINISZTRÁCIÓ ÉS JOGOSULTSÁGOK

`/adminisztracio` (admin): felhasználók, katalógus, **leltárjóváhagyás**, **Közlemények** fül (hír létrehozása, fontosság, lejárati idő), globális beállítások, demó visszaállítás.
`/jogosultsagok` (kizárólag superuser): szerepkörök kiosztása és visszavonása kötelező indoklással, teljes szerepkör-audit napló (ki, kinek, mit, mikor, miért).

## 19. ÉRTESÍTÉSEK, KERESÉS, PROFIL

- Értesítési központ példákkal: „DIG-2026-0031 – új ügyintézői üzenet”, „SW-2026-0087 – vezetői jóváhagyás szükséges”, „WEB-2026-0142 – a feladat elkészült, átvételre vár”
- Globális kereső: igények, projektek, szolgáltatások, eszközök, szervezeti egységek
- Profilmenü: Saját profil · Saját igényeim · Saját szervezeti egység · Értesítési beállítások · Szerepkörváltás · Kijelentkezés

## 20. TÖBBNYELVŰSÉG

- Nyelvváltó a fejlécben, a harang ikon és a felhasználói gomb **között**
- `LanguageProvider` (`localStorage` perzisztencia) + ~1400 elemű HU→EN szótár + MutationObserver-alapú DOM-fordító réteg, kézi felülírásokkal és mintázatokkal a dinamikus címkékhez
- A márkajelzések (ÁOK, monogramok) `data-no-i18n` jelöléssel kimaradnak

## 21. CÍMSOR-UX SZABÁLY

A menüből nyíló oldalakon a magyarázó szöveg **nem** állandó felületi elem: közös `PageHeading` komponens jeleníti meg asztali gépen hover-tooltipként a címsoron, mobilon info ikonra kattintva popoverben. A „hozzáférés megtagadva” magyarázatok kivételek — azok mindig láthatók maradnak.

## 22. ADATMODELL

`src/lib/types.ts` + `src/lib/asset-types.ts`:
Users · OrgUnits · ServiceDomains · ServiceTeams · CatalogItems · ServiceRequests · RequestStatuses · RequestMessages · Attachments · Approvals · Assignments · Projects · Tasks · Notifications · SLAs · Ratings · AuditEvents · RoleAuditEvents · Announcements · InventoryItems + HardwareSpec · Assets · AssetModels · AssetEvents · AssetLocations · LifecyclePolicies · HardwareStandards · ReferencePrices · FundingSources · SoftwareProducts · PersonalSoftwareLicences · ReplacementDecisions · ProcurementPlanItems · PlanApprovals · InventoryDiscrepancies.

Store-műveletek (`src/lib/store.tsx`): `login`, `logout`, `setActiveRole`, `switchUser`, `createRequest`, `updateRequest`, `setStatus`, `addMessage`, `decideApproval`, `rateRequest`, `markNotificationsRead`, `addInventoryItem`, `removeInventoryItem`, `decideInventoryItem`, `updateAsset`, `submitCheck`, `resolveDiscrepancy`, `decideReplacement`, `markLicenceUnused`, `addPlanItem`, `updatePlanItem`, `removePlanItem`, `setUserRoles`, `addAnnouncement`, `updateAnnouncement`, `removeAnnouncement`, `dismissAnnouncement`, `resetDemo`.

## 23. AUDITÁLHATÓSÁG, ADATVÉDELEM

Naplózandó: beküldés, státuszváltás, kiosztás, jóváhagyás, elutasítás, határidő-módosítás, besorolás- és felelősváltás, projektté alakítás, lezárás, leltárdöntés, licencdöntés, csere-döntés, terv jóváhagyása, szerepkör-módosítás.
Szerepkör-alapú hozzáférés; listanézetekben nem jelennek meg szükségtelen érzékeny adatok; minden AI-jellegű kimenet emberi felülvizsgálat alatt marad.

## 24. DEMÓ ADATOK

~30 szolgáltatási igény minden státuszban elosztva · 12+ katalóguselem · 6–8 digitalizációs projekt · 15+ felhasználó · 8 szervezeti egység (Dékáni Hivatal, Élettani Intézet, Anatómiai Intézet, Biokémiai és Orvosi Kémiai Intézet, Farmakológiai és Farmakoterápiai Intézet, klinikai, oktatási és kutatási egységek) · több szolgáltatási csapat · ~180 eszköz · teljes 2027-es beszerzési terv. Az adatok belsőleg konzisztensek, magyar nyelvűek és realisztikusak, de nem valós intézményi adatok.

## 25. MCP INTEGRÁCIÓ

Csak olvasható MCP-szerver `pte-aok-szolgaltatasi-kozpont` néven, eszközök: `search_catalog`, `list_requests`, `get_request`, `search_assets`, `get_asset`, `procurement_plan`, `lifecycle_forecast`.

## 26. INTERAKTIVITÁSI MINIMUM

Működnie kell: igény beküldése, végiglépkedés a varázslón, piszkozat mentése, igény megnyitása, munkatér szűrése, státuszváltás ügyintézőként, jóváhagyás vezetőként, üzenet küldése, belső jegyzet rögzítése, projekt megnyitása, dashboard szűrése és lefúrása, katalógus böngészése, leltártétel rögzítése és jóváhagyása, beszerzési terv szerkesztése és dékáni jóváhagyása, szerepkör kiosztása, közlemény publikálása, nyelvváltás.

## 27. TOVÁBBFEJLESZTÉSI IRÁNY

Az architektúra modulárisan készül, hogy később integrálható legyen: Microsoft Entra ID, Microsoft 365, Power Automate, Power BI, SharePoint, HR-, pénzügyi, beszerzési és dokumentumkezelő rendszerek, egyetemi API-k. A jelenlegi verzió mock adatréteget használ; a következő lépés a perzisztens adatbázis (PostgreSQL) bevezetése ugyanezzel a sémával.
