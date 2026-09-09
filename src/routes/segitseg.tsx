import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/types";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/segitseg")({
  head: () => ({
    meta: [
      { title: "Segítség – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content: "Hogyan működik az igénylés, mit jelentenek az állapotok és kihez fordulhat.",
      },
      { property: "og:title", content: "Segítség – ÁOK Digitális Szolgáltatási Portál" },
      { property: "og:description", content: "Útmutató a portál használatához." },
    ],
  }),
  component: Help,
});

function Help() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <PageHeading
          title="Segítség"
          description="A portál célja, hogy egyetlen helyen lehessen digitális és informatikai igényt indítani. Nem kell tudnia, melyik egység illetékes – a rendszer belül irányítja az igényt."
        />
      </div>

      <Accordion type="single" collapsible className="card-surface px-5">
        <AccordionItem value="a">
          <AccordionTrigger>Hogyan indítok új igényt?</AccordionTrigger>
          <AccordionContent>
            A <Link to="/" className="text-primary underline">kezdőlapon</Link> válassza az
            „Informatikai eszköz” csempét, majd kövesse a termékkör- és modellválasztás lépéseit.
            Technikai megoldást nem kell megadnia.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Mit jelentenek az állapotok?</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-1">
              {STATUS_ORDER.map((s) => (
                <li key={s}>
                  <strong>{STATUS_LABELS[s]}</strong> – az igény ebben a szakaszban van; nem minden
                  igény jár végig minden állapoton.
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="c">
          <AccordionTrigger>Ki hagyja jóvá az igényemet?</AccordionTrigger>
          <AccordionContent>
            Alapesetben a szervezeti egység vezetője. Költséggel járó vagy nagyobb fejlesztési
            igényeknél a költségkeret-gazda, a szolgáltatásgazda, illetve a Dékáni Hivatal is
            bekapcsolódik. A jóváhagyási utat az igény adatlapján követheti.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="d">
          <AccordionTrigger>Hogyan használjuk a mesterséges intelligenciát?</AccordionTrigger>
          <AccordionContent>
            Az AI segít pontosítani a leírást, javaslatot tesz a besorolásra, jelzi a lehetséges
            duplikációkat és összefoglalókat készít. Minden javaslat ajánlás: döntést kizárólag
            munkatárs hoz, és minden javaslat visszanézhető.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="e">
          <AccordionTrigger>Adatkezelés</AccordionTrigger>
          <AccordionContent>
            A portál szerepkör alapú hozzáférést alkalmaz: mindenki csak a feladatához szükséges
            adatokat látja. A belső megjegyzések nem jelennek meg az igénylőnél, a listanézetek pedig
            nem tartalmaznak szükségtelen személyes adatot.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}