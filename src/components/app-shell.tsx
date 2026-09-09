import { Link, useRouterState } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  ClipboardList,
  GaugeCircle,
  CheckCheck,
  KeyRound,
  Home,
  LifeBuoy,
  LogOut,
  Laptop,
  Boxes,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
  Trash2,
  Search,
  Settings2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { lookup, useStore, USERS } from "@/lib/store";
import { ROLE_LABELS, type RoleKey } from "@/lib/types";
import { LoginScreen } from "@/components/login-screen";
import { GlobalSearch } from "@/components/global-search";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DEMO_USER_IDS } from "@/lib/demo-users";
import { DemoBanner, DemoController } from "@/components/demo-panel";
import { useDemoMode } from "@/lib/demo-mode";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  roles: RoleKey[];
}

const ALL: RoleKey[] = [
  "it_referens",
  "eszkozmenedzser",
  "igenylo",
  "jovahagyo",
  "ugyintezo",
  "szolgaltatasgazda",
  "vezeto",
  "dekan",
  "admin",
  "beszerzo",
  "gazdasagi_vezeto",
];

const NAV: NavItem[] = [
  { to: "/", label: "Kezdőlap", icon: Home, roles: ALL },
  { to: "/igenyeim", label: "Igényeim", icon: ClipboardList, roles: ALL },
  { to: "/leltar", label: "Személyi leltár", icon: Laptop, roles: ALL },
  { to: "/eszkozkataszter", label: "Eszközkataszter", icon: Boxes, roles: ["eszkozmenedzser", "it_referens", "beszerzo", "gazdasagi_vezeto", "vezeto", "dekan", "admin"] },
  { to: "/beszerzesek", label: "Beszerzői munkatér", icon: PackageCheck, roles: ["beszerzo", "eszkozmenedzser", "gazdasagi_vezeto", "dekan"] },
  { to: "/beszerzesi-terv", label: "Beszerzési terv", icon: ShoppingCart, roles: ["eszkozmenedzser", "beszerzo", "gazdasagi_vezeto", "vezeto", "dekan"] },
  { to: "/eszkozatadas", label: "Eszközátadás", icon: PackageCheck, roles: ["it_referens", "eszkozmenedzser", "beszerzo", "dekan"] },
  { to: "/selejtezes", label: "Selejtezési javaslat", icon: Trash2, roles: ["eszkozmenedzser", "gazdasagi_vezeto", "dekan"] },
  { to: "/eletciklus-elorejelzes", label: "Életciklus-előrejelzés", icon: TrendingUp, roles: ["eszkozmenedzser", "gazdasagi_vezeto", "szolgaltatasgazda", "vezeto", "dekan"] },
  { to: "/jovahagyasok", label: "Jóváhagyási sor", icon: CheckCheck, roles: ["jovahagyo", "ugyintezo", "szolgaltatasgazda", "vezeto", "dekan"] },
  { to: "/vezetoi-attekintes", label: "Vezetői áttekintés", icon: GaugeCircle, roles: ["vezeto", "dekan", "szolgaltatasgazda", "gazdasagi_vezeto"] },
  { to: "/adminisztracio", label: "Adminisztráció", icon: Settings2, roles: ["admin", "dekan"] },
  { to: "/jogosultsagok", label: "Jogosultságkezelés", icon: KeyRound, roles: ["admin", "dekan"] },
  { to: "/segitseg", label: "Segítség", icon: LifeBuoy, roles: ALL },
];

export function AppShell({ children }: { children: ReactNode }) {
  const store = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  /** Rá váró döntés esetén a jóváhagyási sor a szerepkörtől függetlenül elérhető. */
  const hasPendingApproval = useMemo(
    () =>
      store.requests.some((r) =>
        r.approvals.some(
          (a) => a.decision === "fuggoben" && a.approverId === store.currentUser.id,
        ),
      ),
    [store.requests, store.currentUser.id],
  );

  const { demo: demoMode } = useDemoMode();

  const items = useMemo(
    () =>
      NAV.filter(
        (n) =>
          n.roles.includes(store.activeRole) ||
          (n.to === "/jovahagyasok" && hasPendingApproval),
      ),
    [store.activeRole, hasPendingApproval],
  );

  if (!store.loggedIn) return <LoginScreen />;


  const unread = store.notifications.filter((n) => !n.read).length;
  const user = store.currentUser;

  return (
    <div className="min-h-dvh bg-background">
      <DemoBanner />
      <DemoController />
      <a
        href="#fotartalom"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Ugrás a tartalomhoz
      </a>
      <header className="sticky top-0 z-40 shadow-sm">
        <div className="pte-topbar">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center gap-4 px-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-sm border border-white/25 bg-white/10 pte-wordmark text-sm font-bold">
              ÁOK
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="pte-wordmark block text-base font-bold">
                Pécsi Tudományegyetem
              </span>
              <span className="block text-xs tracking-wide opacity-80">
                Általános Orvostudományi Kar · Digitális Szolgáltatási Portál
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden w-72 items-center gap-2 rounded-sm border border-white/25 bg-white/10 px-3 py-2 text-left text-sm text-white/75 transition-colors hover:bg-white/20 lg:flex"
            >
              <Search className="size-4" aria-hidden="true" />
              <span className="truncate">Keresés igények és eszközök között…</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/15 hover:text-white lg:hidden"
              aria-label="Keresés"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" />
            </Button>


            <Popover onOpenChange={(o) => o && store.markNotificationsRead()}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/15 hover:text-white" aria-label={`Értesítések (${unread} olvasatlan)`}>
                  <Bell className="size-5" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-0">
                <p className="border-b border-border px-4 py-3 text-sm font-semibold">Értesítések</p>
                <ul className="max-h-80 divide-y divide-border overflow-auto">
                  {store.notifications.map((n) => (
                    <li key={n.id}>
                      <Link
                        to="/igeny/$id"
                        params={{ id: n.requestId ?? "" }}
                        className="block px-4 py-3 text-sm hover:bg-secondary"
                      >
                        <span className="block">{n.text}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{n.at}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>

            <LanguageSwitcher />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-sm border border-white/25 px-2 py-1.5 text-left text-white hover:bg-white/15">
                  <span data-no-i18n className="grid size-7 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {user.initials}
                  </span>
                  <span className="hidden leading-tight md:block">
                    <span className="block text-xs font-medium">{user.name}</span>
                    <span className="block text-[11px] text-white/70">
                      {ROLE_LABELS[store.activeRole]}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>
                  <span className="block">{user.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {user.title} · {lookup.unit(user.orgUnitId)}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profil">
                    <UserRound className="size-4" /> Saját profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/igenyeim">Saját igényeim</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Demó: szerepkör váltása
                </DropdownMenuLabel>
                {user.roles.map((r) => (
                  <DropdownMenuItem
                    key={r}
                    onSelect={() => store.setActiveRole(r)}
                    className={cn(store.activeRole === r && "font-semibold")}
                  >
                    {ROLE_LABELS[r]}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Demó: felhasználóváltás
                </DropdownMenuLabel>
                {store.users
                  .filter(
                    (u) =>
                      DEMO_USER_IDS.includes(u.id) ||
                      (store.extraUsers ?? []).some((e) => e.id === u.id),
                  )
                  .map((u) => (
                    <DropdownMenuItem key={u.id} onSelect={() => store.switchUser(u.id)}>
                      {u.name} – {ROLE_LABELS[u.roles[0]!]}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => store.logout()}>
                  <LogOut className="size-4" /> Kijelentkezés
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        </div>

        <nav aria-label="Fő navigáció" className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-2 lg:px-6">
            {items.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to as "/"}
                  className={cn(
                    "flex items-center gap-2 border-b-[3px] px-3 py-3.5 text-[13px] font-medium tracking-wide whitespace-nowrap uppercase transition-colors",
                    active
                      ? "border-accent font-semibold text-primary"
                      : "border-transparent text-muted-foreground hover:border-accent/40 hover:text-primary",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <item.icon className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main
        id="fotartalom"
        className={`mx-auto max-w-[1400px] px-4 py-8 lg:px-8 ${demoMode ? "pb-64" : ""}`}
      >
        {children}
      </main>

      <footer className="pte-band mt-8">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-10 lg:px-8">
          <span className="pte-wordmark text-lg font-bold">Pécsi Tudományegyetem</span>
          <span className="text-sm opacity-85">
            Általános Orvostudományi Kar · Digitális Szolgáltatási Portál – belső prototípus
          </span>
          <span className="max-w-3xl text-xs opacity-70">
            Egy belépési pont a digitális igényeknek. Átlátható folyamatok, világos felelősségek,
            mérhető szolgáltatásminőség.
          </span>
        </div>
      </footer>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}