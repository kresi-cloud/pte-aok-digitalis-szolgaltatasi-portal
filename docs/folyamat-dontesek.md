# IT eszközbeszerzési folyamat – döntésnapló

A folyamat-átgondolás során hozott döntések, a meghozataluk sorrendjében.
Minden tétel: a kérdés, a döntés, a következmény a prototípusra.
(Készült: 2026-09-14, folyamatosan bővül.)

## 1. kör – alapelvek

### D1. A szervezeti jóváhagyáskor rögzített bruttó költségkeret kötelező érvényű, tűrésküszöbbel
- **Döntés:** a tervezett és a tényleges ár a keretet legfeljebb egy küszöbbel lépheti túl; felette
  az igénylő értesül, és a szervezeti jóváhagyónak újra döntenie kell.
- **Következmény:** változás-kezelési szabály az IT besorolás (modell/ár módosítás) és a beszerzés
  (tényleges ár) lépésénél; a küszöb értéke a 2. körben.

### D2. Egy igény = egy termék, darabszámmal
- **Döntés:** egy igény egy termékkör/modell, kötelező darabszámmal; több különböző eszköz több igény.
- **Következmény:** a darabszám kötelező mező az igénylési űrlapon (ma a szöveges leírásból
  becsli a rendszer); a tervsor és a részteljesítés darabszám-alapú.

### D3. Lépésenkénti döntési határidő, emlékeztetővel és eszkalációval
- **Döntés:** minden várakozó lépésnek munkanapban mért határideje van; a határidő 80%-ánál
  emlékeztető a felelősnek, lejáratkor eszkaláció.
- **Következmény:** „mióta vár” és „határidő” minden várakozó tételnél; lépésenkénti átfutási
  idő mérhető a vezetői irányítópulton; az értékek és az eszkaláció iránya a 2. körben.

### D4. Átvételi kifogás-út
- **Döntés:** az igénylő az átvételkor kifogást jelezhet indoklással (rossz, sérült, hiányos eszköz);
  az ügy visszakerül a kari IT referenshez. Ha az igénylő nem reagál: emlékeztető, majd automatikus
  lezárás naplóbejegyzéssel.
- **Következmény:** új átadási állapot („kifogásolva”), a 6–8. lépés visszaléphet; a napok száma a
  2. körben.

## 2. kör – paraméterek és helyettesítés

### D5. Költségkeret-küszöb: 10%
- **Döntés:** a jóváhagyott bruttó keret 10%-os túllépéséig nincs újra-jóváhagyás; felette az igénylő
  értesül és a szervezeti jóváhagyó újra dönt. Összeghatár nincs.

### D6. Lépésenkénti határidők: alapértékek + admin által konfigurálható
- **Döntés:** kiinduló értékek munkanapban – szervezeti jóváhagyás 5, IT besorolás 10, gazdasági
  jóváhagyás 5, konfigurálás 5, átvétel visszaigazolása 5 (10 nap után automatikus lezárás);
  a beszerzésnél a várható érkezés dátuma a határidő.
- **Kiegészítés (megrendelői igény):** állami fenntartású intézménynél az átfutások erősen
  ingadoznak, ezért **minden határidő az adminisztrációs felületen szabadon állítható**, a
  módosítás naplózva; a folyamat sehol nem kódol be fix napszámot.
- **Következmény:** „folyamat-beállítások” szakasz az Adminisztrációban; a határidő-számítás
  a beállításból dolgozik; a tesztek az alapértékekkel futnak.

### D7. Eszkaláció: csak jelzés, nincs átvétel
- **Döntés:** lejárt határidőnél az ügy piros jelzést kap a vezetői és a saját munkatéri nézetben,
  a felelős és a szakmai felügyelet értesítést kap, de a felelős marad – senki nem veszi át
  automatikusan a döntést.
- **Következmény:** nincs „eszkalációs lépcső”; a lejárt ügyek listája a vezetői irányítópulton,
  a késés a lépésenkénti átfutás-mutatóban látszik.

### D8. Időszakos helyettesítés: a felhasználó állítja be
- **Döntés:** a felhasználó a profilján helyettest és időszakot ad meg; az időszak alatt a hozzá
  érkező teendők a helyettesnél jelennek meg, minden döntésnél naplózva, hogy helyettesként
  történt. Az admin felülírhatja. Az egységenkénti fix helyettes jóváhagyó (önjóváhagyás ellen)
  megmarad, ez arra épül rá.

## 3. kör – tervezés és beszerzés

### D9. Ütemezés eltérése az igénylő kérésétől: indoklás kötelező, az igénylő értesül
- **Döntés:** ha az IT eszközmenedzser az igénylő kért ütemezésétől (azonnali / negyedév) eltérően
  sorol be, az eltérést indokolnia kell; az igénylő értesítést kap és az igényén látja az indoklást.
  A folyamat nem áll meg, beleegyezés nem szükséges.
- **Következmény:** az ütemezés módosítása a tervsoron indoklás-mezőt kap; értesítés + napló.

### D10. Gazdasági döntés: csomag jóváhagyása tételek kiemelésével
- **Döntés:** a gazdasági vezető a csomagból egyes tételeket indoklással kiemelhet; a többi tétel
  jóváhagyva a beszerzőhöz kerül, a kiemelt tétel külön kört fut az eszközmenedzserrel
  (átdolgozás → újbóli beküldés → döntés). Egy problémás tétel nem állítja meg a csomagot.
- **Következmény:** tételszintű állapot a csomagon belül („kiemelve”), a visszaküldés tételre is
  értelmezhető; a beszerző csak a jóváhagyott tételeket látja indíthatóként.

### D11. Beszerzési megszakítás / helyettesítés ág a beszerzőnek
- **Döntés:** a beszerző jelezheti az akadályt (nem szállítható, kifutott modell) és helyettesítő
  modellt javasolhat. Ha az ár vagy a modell változik, a D1/D5 szabály lép be (10% felett újra-
  jóváhagyás, az igénylő értesül). Ha nincs helyettesítő, az ügy „beszerzés meghiúsult” állapotban
  zárul, az igénylő értesül és új igényt adhat be.
- **Következmény:** új tervsor-állapot („akadályozott”), új igény-lezárási ok („meghiúsult”);
  a visszavonási tiltás gazdasági jóváhagyás után megmarad, de az ügy nem ragadhat be.

### D12. Rendelési rekord + részteljesítés
- **Döntés:** „Beszerzés indítása” után a beszerző rögzíti: szállító, rendelésszám, várható érkezés,
  tényleges nettó/bruttó ár; „Beérkezett” darabszámmal, több darabnál részteljesítéssel.
  Az igénylő látja a várható érkezést; a tényleges ár a D5 küszöbellenőrzés bemenete; a várható
  érkezés a beszerzési lépés határideje (D6).

## 4. kör – átadás, értesítés, keret, leltár

### D13. Régi eszköz sorsa: kötelező döntés átadáskor
- **Döntés:** ha az igény csere-jellegű (van lecserélendő eszköz), az átadáskor az IT referensnek
  kötelezően rögzítenie kell a régi eszköz sorsát: visszavétel raktárba, selejtezésre jelölés,
  vagy maradhat az igénylőnél (indoklással). Döntés nélkül az átadás nem zárható le.
- **Következmény:** az igénylési űrlapon „lecserélendő eszköz” hivatkozás (leltári azonosító);
  az átadási lépés kötelező mezője a régi eszköz sorsa; a leltár állapota ennek megfelelően
  változik (raktár / selejt / marad).

### D14. Értesítések: személyre szólóak, a következő teendővel
- **Döntés:** minden értesítés a konkrét felelősnek szól (nem szerepkörnek), tartalmazza az ügy
  azonosítóját, a lépést és a várt teendőt; a helyettesítés (D8) alatt a helyettes is kapja.
  Az igénylő minden állapotváltásról értesül, indoklással együtt, ahol van.
- **Következmény:** az értesítés-modell „címzett + ügy + lépés + teendő + határidő” mezőkkel;
  a fejléc-harang csak a saját teendőket mutatja; szerepkör-szintű „mindenkinek” értesítés nincs.

### D15. Keret-egyenleg: figyelmeztetés, indoklással jóváhagyható
- **Döntés:** ha az egység negyedéves / éves keretét az igény kimerítené, a szervezeti jóváhagyó
  figyelmeztetést lát, de indoklással jóváhagyhatja; a túllépés a gazdasági jóváhagyásnál
  kiemelten látszik. Kemény tiltás nincs.
- **Következmény:** egység-szintű keret és aktuális felhasználás nyilvántartása; keret-figyelmeztető
  sáv a jóváhagyási nézeten, indoklás kötelező túllépésnél; a gazdasági nézet jelöli a
  kerettúllépő tételeket.

### D16. Leltárba vétel: beérkezéskor raktáron, átadáskor személyhez
- **Döntés:** a beérkezett eszköz a „Beérkezett” rögzítésekor kap leltári azonosítót és raktári
  állapotot; az átadáskor kerül az igénylő személyéhez és szervezeti egységéhez. Részteljesítésnél
  darabonként történik.
- **Következmény:** a leltári tétel az eszköz életútját a beszerzési rekordból (D12) örökli
  (szállító, rendelésszám, ár); az átadási jegyzőkönyv leltári azonosítót tartalmaz;
  a „Beérkezett” lépés a részteljesítés darabszámával hoz létre leltári tételeket.
