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
- **Következmény:** új átadási állapot („kifogásolva”), a 6–8. lépés visszaléphet; a napok száma a 2. körben.

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

## 5. kör – megvalósítási sorrend

### D17. Beépítési sorrend: folyamat-lezárók előbb

- **Döntés:** 1) D4 átvételi kifogás + D13 régi eszköz sorsa; 2) D3/D6/D7 konfigurálható
  határidők, „mióta vár”, lejárt-jelzés; 3) D2 darabszám + D12 rendelési rekord/részteljesítés +
  D16 leltárba vétel; 4) D1/D5 10%-os változás-kezelés + D11 beszerzési megszakítás; 5) D9 ütemezés-indoklás + D10 tételszintű kiemelés; 6) D14 személyre szóló értesítések +
  D8 időszakos helyettesítés + D15 keret-egyenleg.
- **Indok:** a meglévő, végigtesztelt 8 lépéses lánc előbb minden kimenetén záródjon, azután
  jöjjön a paraméterezés, végül a nagyobb adatmodell-bontás; a 10%-os szabály a tényleges árat
  (D12) igényli, ezért az után következik.

### D18. Munkamód: csomagonként, jóváhagyással

- **Döntés:** egy-egy tematikus csomag → teljes e2e-teszt → CI-zöld commit a main-re → rövid
  beszámoló; a következő csomag a megrendelő jóváhagyása után indul.
- **Dokumentum:** külön megosztható folyamat-oldal nem készül, a döntésnapló a repóban elegendő.

## Megvalósítási megjegyzések

### 1. csomag – D4, D13 (kész)

- Kifogásnál az ügy „Megvalósítás alatt” státuszba lép vissza; az átadáskor létrehozott
  „Átvételre vár” leltártétel visszakerül, az eszköz fizikailag a referensnél van.
- A régi eszköz sorsa a kataszterben: raktárnál megszűnik a személyhez rendelés (felelős a
  referens), selejtnél „selejtezésre vár” életciklus-jelölés, „marad”-nál csak napló.

### 2. csomag – D3, D6, D7 (kész)

- A határidők munkanapban, hétvége nélkül számolnak; ünnepnapokat a prototípus nem kezel.
- A 6. (konfigurálás) és a 7. (eszközátadás) lépés egy közös „Konfigurálás és átadás”
  határidőt kap, mert ugyanaz a felelős és ugyanaz a rekord.
- A beszerzési lépés határideje a beszerző által rögzített várható érkezés (a 3. csomag
  rendelési rekordja tölti); amíg nincs, az admin által állított alapérték (30 munkanap).
- A „mióta vár” a lépésbe lépés naplózott dátumából számít (beküldés/pontosítás,
  eszközmenedzserhez adás, gazdasági beküldés, jóváhagyás, beérkezés, átadás).
- Emlékeztető és lejárt-jelzés értesítésként jelenik meg (a felelős nevével és a
  határidővel), egyszer, lépésenként; a vezetői irányítópulton lépésenkénti átlagos
  várakozás és a lejárt ügyek listája látható. Nincs átvétel: a felelős marad.
- Az átvétel visszaigazolásának elmaradásakor a beállított munkanap után a rendszer zárja le
  az ügyet („u-system” szereplővel, naplózva); kifogásolt eszköznél nem fut automatikus lezárás.

### 3. csomag – D2, D12, D16 (kész)

- Darabszám: személyi használatú eszköznél mindig 1; nem személyi igénynél kötelező, egész,
  legalább 1 – a lépés nem folytatható nélküle.
- Rendelési rekord a beszerzés indításakor: szállító, rendelésszám, várható érkezés
  kötelező; tényleges nettó egységár opcionális (bruttó 27% áfával számolva). A várható érkezés
  a beszerzési lépés határideje, az igénylő értesítést kap és az igényén látja.
- Beérkezés darabszámmal: több darabnál részteljesítés; a hátralévő darabok beszerzés alatt
  maradnak, a beszerző gombja mutatja az arányt (N/M db).
- Leltárba vétel beérkezéskor: minden beérkezett darab azonnal kataszter-tételt és sorszámozott
  PTE leltári számot kap „raktáron” állapottal (Kari IT raktár helyszín, felelős a referens);
  az átadáskor a személyhez, egységhez és munkahelyéhez kerül, a gyári számmal.
- Darabonként egy átadási rekord (N/M. darab); az ügy és a tervsor csak akkor zárul, ha minden
  darab beérkezett és átvétele visszaigazolva. A folyamatjelző a legkevésbé előrehaladott darabot
  mutatja.

### 4. csomag – D1, D5, D11 (kész)

- A keret a jóváhagyáskori bruttó becsült költség pillanatképe (`approvedBudgetGross`); a
  küszöb (alapból 10%) a Folyamat-beállításokban állítható.
- Küszöbellenőrzés minden árváltozásnál: tervsor-módosítás (ár, darabszám, modell), tényleges
  ár a rendelésben, helyettesítő modell. Túllépésnél felülvizsgálat nyílik a szervezeti
  jóváhagyónál, az igénylő értesül; a beszerzés indítása és a beérkezés rögzítése áll, amíg
  a jóváhagyó nem dönt. Jóváhagyás: az új összeg lesz a keret. Elutasítás (indoklással): a
  folyamat áll, amíg az ár a keret alá nem kerül vagy új, más összegű kör nem indul.
- A rendelési rekordban a tényleges ár bruttó egységárként kerül rögzítésre (a keret ugyanezen az
  alapon készül); a nettó tájékoztató.
- Beszerzési akadály: a beszerző indoklással helyettesítő modellt rögzít (katalógusból vagy
  kézzel, bruttó egységárral) – a tervsor és a rendelés az új modellre és árra vált, majd
  fut a küszöbellenőrzés; helyettesítő nélkül a tétel és az igény „Beszerzés meghiúsult”
  állapotba kerül (lezárt, megszakadt folyamat), az igénylő új igényt adhat be. Beérkezett
  darab után akadály már nem jelezhető.

### 5. csomag – D9, D10 (kész)

- Ütemezés-eltérés: az igénylő kért ütemezése (azonnali / évszámos negyedév) és a tervsor
  besorolása összevetve; eltérő bontásnál vagy célnegyedévnél a beszerzői munkatér indoklást
  kér (dialógus, tömeges átütemezésnél mező), enélkül a módosítás nem rögzül. Az eltérés a
  tervsoron és az igényen látszik, az igénylő értesítést kap; egyezésnél az eltérés törlődik.
- Tételszintű kiemelés: a gazdasági vezető a csomag jóváhagyásakor egyes tételeket indoklással
  kiemelhet; a csomag jóváhagyva, a kiemelt tételek beszerzése áll. Az IT eszközmenedzser
  átdolgozás után leírással újra beküldi; a gazdasági vezető jóváhagyja vagy ismét kiemeli
  (újabb kör, indoklással). Minden lépésnél értesítés az igénylőnek, audit a tervsoron.

### 6. csomag – D8, D14, D15 (kész)

- Személyre szóló értesítések: minden értesítés címzettje az igénylő és a lépés konkrét felelőse
  (a helyzet-modellből levezetve, tartósan rögzítve); a fejléc-harang csak a saját (és a
  helyettesített) tételeket mutatja, a felelősnél a teendővel, lépéssel és határidővel.
  Ügyhöz nem kötött (tervciklus-) értesítések a beszerzés szereplőinek szólnak; általános
  „mindenkinek” értesítés nincs.
- Időszakos helyettesítés: a felhasználó a profilján helyettest és időszakot ad meg (aktív
  munkatárs, nem saját maga); az admin bárkinek beállíthatja vagy törölheti. Az időszak alatt a
  szervezeti jóváhagyás és a kerettúllépés döntése a helyettesnél is megjelenik, a döntés
  „helyettesként (X helyett)” naplózódik; a fejlécben látszik, kit helyettesít. Az egységenkénti
  fix helyettes jóváhagyó (önjóváhagyás ellen) változatlan. A szerepkör-alapú lépéseknél
  (eszközmenedzser, gazdasági vezető, beszerző, referens) a helyettesítés nem személyhez kötött.
- Egység-keret: egységenkénti éves bruttó IT-keret (alapból 5 000 000 Ft, az Adminisztráció →
  Szervezeti egységek fülön állítható); felhasználás = az egység jóváhagyott vagy folyó
  eszközigényei az adott évben. Ha az igény kimerítené a keretet, a jóváhagyó figyelmeztetést
  lát, jóváhagyás csak indoklással; a túllépés az igényen és a beszerzői munkatéren jelvénnyel
  látszik. Kemény tiltás nincs.

## Záró végigtesztelés (2026-09-14)

Egyetlen ügy, egyetlen állapotban, az összes ág egymás után, a felületen vezérelve
(41 ellenőrzés, 0 hiba; futás közben nincs böngészőhiba):

1. Igénylés (D2, 1 db személyi eszköz) → a szervezeti jóváhagyó helyettest állít be (D8) →
   a helyettes egység-keret figyelmeztetéssel, indoklással hagy jóvá (D15); a döntés
   „helyettesként” naplózódik, a keret pillanatképe rögzül (D1).
2. IT besorolás: ütemezés-eltérés indoklással, majd visszaállítás (D9); +25% ár →
   kerettúllépés, a helyettes elutasítja; +15% → új kör, jóváhagyva, új keret (D5).
3. Gazdasági jóváhagyás egy tétel kiemelésével, átdolgozás, újbóli beküldés, jóváhagyás (D10).
4. Beszerzés: akadály helyettesítő modellel (D11), rendelés várható érkezéssel és tényleges
   árral (D12), beérkezés → kataszter-tétel raktáron, leltári számmal (D16).
5. Átadás a régi eszköz selejtezésre jelölésével (D13) → az igénylő kifogást jelez, a referens
   kezeli, ismételt átadás (D4) → lejárt határidő jelzése az igényen, értesítés, vezetői
   irányítópult (D3/D7) → 10 munkanap után automatikus lezárás (D6), leltártétel jóváhagyva.
6. Az igény auditja az összes ág nyomát tartalmazza; az ügy értesítései címzettekkel, az
   igénylő mindenhol címzett (D14); a helyettesítést az admin törli, a beállítás-napló rögzíti.

Regresszió ugyanezen a buildön: fő ág 8/8, kifogás 50/50, határidők 38/38, visszaküldés
17/17, elutasítás/visszavonás 38/38, rendelés/részteljesítés 57/57, keret/akadály 53/53,
ütemezés/kiemelés 43/43, helyettesítés/értesítés/egység-keret 35/35; 107 egységteszt; mobil
(400 px) túlcsordulás és axe-hiba nélkül az érintett oldalakon.

## Angol nyelvi átfésülés (2026-09-15)

Szabály: a felületi, taxonómiai és rendszerszövegek angolul jelennek meg, az adatok (igénycímek,
nevek, terméknevek, felhasználói szabad szöveg, demó-tartalom) magyarul maradnak.

- Forrás-audit: `bun scripts/i18n-audit.ts` – a `src` alatti JSX-szövegek, sztringliterálok és
  sablonok átmennek a fordítón; ami magyar marad (részben is), a jelentésbe kerül. Kiindulás:
  1996 egyedi magyar szöveg, 618 fordítatlan; a végén csak adat- és azonosító jellegű tételek
  maradnak (CSV-oszlopnevek, kulcsszavak, fájlnevek).
- Új sablonréteg (`src/lib/i18n/templates.ts`): `{n}` helyőrzős minták; a fordító előbb az egész
  szövegre próbálja a sablonokat, majd mondatonként, elválasztónként (·, –, |, /, →, vessző),
  bevezető jel, zárójel, „címke: érték" és záró írásjel szerint bontva, rekurzívan fordít; a
  befogott részek (dátum, összeg, állapotnév) tovább fordulnak. Csak számmal álló minták kezelik a
  pénznemet és mennyiséget (Ft → HUF, db → pc/pcs, munkanap).
- Futásidejű ellenőrzés: a záró forgatókönyv állapotával 11 szerepkör × 21 útvonal + minden
  igényoldal DOM-szintű átfésülése angolul (menük, fülek, lenyílók kinyitva); a maradék
  kizárólag adat (nevek, terméknevek, szabad szöveg).

## Nyitott tételek

- Az org-egységek angol nevei az aok.pte.hu alapján ellenőrzendők (a domain a fejlesztői
  környezetből nem érhető el; a jelenlegi nevek fordítások).
- Ünnepnapokat a munkanap-számítás nem ismer (csak a hétvégét hagyja ki).
- A helyettesítés a személyhez kötött lépéseknél működik (szervezeti jóváhagyás,
  kerettúllépés); a szerepkör-alapú lépéseknél nem személyhez kötött.
