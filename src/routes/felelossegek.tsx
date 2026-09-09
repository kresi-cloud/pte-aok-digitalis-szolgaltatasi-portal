import { createFileRoute } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RESPONSIBILITIES, lookup } from "@/lib/store";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/felelossegek")({
  head: () => ({
    meta: [
      { title: "Szolgáltatások és felelősségek – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Felelősségi mátrix: melyik szolgáltatást melyik egység nyújtja, ki a gazdája és mi az eszkalációs út.",
      },
      { property: "og:title", content: "Szolgáltatások és felelősségek" },
      { property: "og:description", content: "Szolgáltatásgazdák, SLA-k és eszkalációs utak." },
    ],
  }),
  component: Matrix,
});

function Matrix() {
  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Szolgáltatások és felelősségek"
          description="Ez a mátrix teszi átláthatóvá, hogy az egyes szolgáltatásoknál ki a felelős, ki hagy jóvá és hová lehet eszkalálni. Az igénylőnek nem kell ismernie – a rendszer eszerint irányít."
        />
      </div>

      <div className="card-surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Szolgáltatás</TableHead>
              <TableHead>Nyújtó egység</TableHead>
              <TableHead>Szolgáltatásgazda</TableHead>
              <TableHead>Végrehajtó csapat</TableHead>
              <TableHead>Jóváhagyó</TableHead>
              <TableHead>Támogató szereplők</TableHead>
              <TableHead>SLA</TableHead>
              <TableHead>Eszkaláció</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RESPONSIBILITIES.map((r) => (
              <TableRow key={r.service}>
                <TableCell className="font-medium">{r.service}</TableCell>
                <TableCell>{r.unit}</TableCell>
                <TableCell>{lookup.userName(r.ownerId)}</TableCell>
                <TableCell>{r.team}</TableCell>
                <TableCell>{r.approver}</TableCell>
                <TableCell className="text-muted-foreground">{r.supporting}</TableCell>
                <TableCell className="whitespace-nowrap">{r.sla}</TableCell>
                <TableCell className="text-muted-foreground">{r.escalation}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}