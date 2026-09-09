# PTE ÁOK Szolgáltatási Központ

Build a production-quality interactive prototype of an internal digital service management portal for the Medical School of the University of Pécs (PTE ÁOK – University of Pécs Medical School).

The application is an internal institutional service portal intended primarily for university employees, departmental administrators, academic staff, managers, and central administrative/service units.

The goal is to create a single, simple entry point for requesting, tracking, approving and managing digital and IT-related services across the Medical School.

The application must NOT look like a traditional IT ticketing system. It should feel like a modern internal service platform: simple for ordinary employees, transparent for requesters, efficient for service teams, and useful for management.

APPLICATION NAME

Use the temporary product name:

“ÁOK Digitális Szolgáltatási Portál”

Subtitle:

“Digitális és informatikai igények egy helyen”

All user-facing interface text must be in Hungarian.

The visual design should be modern, clean, restrained and institutional. Avoid playful startup aesthetics.

Use a professional university / healthcare / enterprise SaaS visual language:

light background

generous whitespace

clear typography

subtle cards

limited accent colours

strong information hierarchy

accessible contrast

responsive desktop-first design

professional icons

no unnecessary gradients or decorative illustrations

The interface should feel comparable in quality to modern products such as Microsoft 365, ServiceNow, Linear, Notion, Atlassian or contemporary government digital service portals, but substantially simpler for end users.

CORE CONCEPT

The platform manages four primary service domains:

Szoftver

Hardver

Honlap és webes megjelenés

Szolgáltatásdigitalizáció és fejlesztés

These should appear prominently on the employee home page as four service cards.

Examples:

SZOFTVER

új szoftver igénylése

meglévő szoftverhez hozzáférés

licencigény

telepítés

fejlesztési igény

rendszerintegráció

szakmai alkalmazás

HARDVER

számítógép

notebook

monitor

periféria

nyomtató

egyéb eszköz

eszközcsere

bővítés

HONLAP ÉS WEBES MEGJELENÉS

új weboldal

meglévő oldal módosítása

új tartalom/funkció

kari vagy tanszéki oldal

űrlap

landing page

technikai probléma

SZOLGÁLTATÁSDIGITALIZÁCIÓ ÉS FEJLESZTÉS

jelenleg manuális folyamat digitalizálása

új belső alkalmazás

workflow

automatizálás

adatgyűjtés

dashboard

riport

integráció

AI-alapú megoldás

szervezeti folyamatfejlesztés

USER ROLES

Create at least the following application roles:

Igénylő Ordinary university employee.

Can:

submit requests

save drafts

view own requests

see status

answer clarification requests

upload documents

communicate with the assigned service team

rate the service after completion

Szervezeti jóváhagyó For example department head, office head or authorised manager.

Can:

approve or reject requests

request clarification

see requests belonging to their organisational unit

see estimated cost and organisational impact

Szolgáltatási ügyintéző Employee of the responsible service unit.

Can:

review incoming requests

classify requests

assign them

change status

request information

add internal notes

estimate complexity

estimate cost

define target completion date

create subtasks

close requests

Szolgáltatásgazda Responsible for a service area.

Can:

manage service catalogue

assign responsible teams

define workflows

define SLA targets

analyse workloads

see all requests in their service domain

Kari vezető / vezetői dashboard felhasználó Dean, vice-dean, director, office head or senior manager.

Can:

access aggregated dashboards

see trends

see major projects

see bottlenecks

see service demand

see costs

see SLA performance

see strategic digitalisation initiatives

Rendszeradminisztrátor Full administrative access.

AUTHENTICATION

Simulate institutional single sign-on.

Login button:

“Belépés PTE azonosítóval”

After login, assume that the system knows:

user name

university email

organisational unit

job role

internal employee ID

manager / organisational approver

Do not require the user to enter information that could reasonably come from the institutional identity system.

For the prototype, create realistic mock users and organisational units.

Example user:

Dr. Kovács Anna egyetemi adjunktus Élettani Intézet

HOME PAGE – ORDINARY EMPLOYEE

The main home screen must immediately answer:

“What can I request?” “What is happening with my existing requests?” “Is there anything I need to do?”

Header:

“Jó napot, Anna!”

Subheading:

“Miben segíthetünk?”

Show the four main service category cards.

Also show:

“Folyamatban lévő igényeim”

Example cards:

WEB-2026-0142 Tanszéki honlap új kutatási aloldala Állapot: Egyeztetés alatt Felelős: Web és digitális kommunikáció Utolsó frissítés: 2 napja

SW-2026-0087 GraphPad Prism licenc Állapot: Jóváhagyásra vár Teendő: tanszékvezetői jóváhagyás

DIG-2026-0031 Hallgatói jelentkezési folyamat digitalizálása Állapot: Megvalósítás alatt Tervezett befejezés: 2026. szeptember 15.

Also show:

“Teendőim”

Example:

“1 igényhez további információ szükséges.”

Provide one primary action:

“Új igény indítása”

SERVICE REQUEST WIZARD

Do NOT immediately show a complex form.

Use a guided multi-step request wizard.

STEP 1

“Miben segíthetünk?”

Select one of the four domains.

STEP 2

“What would you like to achieve?”

Instead of forcing the user to know technical terminology, ask them to describe the desired outcome.

Example prompt:

“Írd le röviden, mit szeretnél elérni. Nem szükséges technikai megoldást megadnod.”

Textarea example:

“Szeretnénk, ha a tanszéki továbbképzésekre a jelentkezés nem e-mailben történne, hanem egy online felületen, és automatikusan készülne résztvevői lista.”

Add an AI-assisted button:

“Segíts pontosítani az igényt”

The AI should transform a vague description into structured information but the user must confirm it before submission.

STEP 3

Ask contextual questions dynamically based on request type.

Examples:

Kik fogják használni?

Körülbelül hány felhasználót érint?

Van kívánt határidő?

Van már meglévő rendszer vagy folyamat?

Kezel-e személyes vagy érzékeny adatot?

Szükséges más rendszerrel integrálni?

Egyszeri igényről vagy tartós szolgáltatásról van szó?

Van rendelkezésre álló költségkeret?

Do not display all questions for every request. Make forms context-sensitive.

STEP 4

Show an automatically generated request summary.

Sections:

Cél Érintett szervezeti egység Felhasználók Kívánt eredmény Határidő Adatkezelési érintettség Integráció Becsült prioritás

Allow editing.

Primary action:

“Igény beküldése”

Secondary action:

“Mentés piszkozatként”

AI TRIAGE

Simulate an AI-assisted triage function after submission.

The system should automatically suggest:

service category

service subtype

responsible service team

complexity

likely workflow

whether approval is needed

potential duplication with an existing request

whether the request may be a larger project rather than a simple service request

Display this only to service personnel, not as an authoritative automated decision.

Always label AI output as a recommendation requiring human confirmation.

REQUEST STATUS MODEL

Use a clear status flow:

Piszkozat Beküldve Első értékelés Pontosítás szükséges Jóváhagyásra vár Elfogadva Tervezés alatt Megvalósítás alatt Tesztelés Átadásra vár Lezárva Elutasítva

Not every request needs every status.

Create a visual timeline showing the request’s progress.

REQUEST DETAIL PAGE

Create a detailed request page.

Header example:

DIG-2026-0031 Hallgatói jelentkezési folyamat digitalizálása

Show:

Status Responsible team Responsible employee Requester Organisational unit Priority Submission date Target completion date Estimated cost Current next step

Sections:

Áttekintés Folyamat Kommunikáció Dokumentumok Kapcsolódó feladatok Döntések Előzmények

The requester must see a simplified version.

Service personnel should additionally see:

Internal classification Internal comments Dependencies Estimated effort Budget implications Procurement requirement IT security requirement Data protection requirement Integration requirement

COMMUNICATION

Each request should have a threaded communication area.

Clearly distinguish:

“Üzenet az igénylőnek”

from

“Belső megjegyzés”

Internal notes must not be visible to the requester.

Notifications should be simulated.

Examples:

“Az ügyintéző további információt kért.”

“Az igényt jóváhagyták.”

“Az igény megvalósítása megkezdődött.”

APPROVAL WORKFLOW

Requests can require different approval paths.

Examples:

software licence: requester → organisational manager → IT/service owner

hardware: requester → manager → budget owner → IT

digitalisation project: requester → organisational manager → service owner → possible dean’s office / management approval

Create a workflow visualisation showing:

who approved when what is pending what decision is next

SERVICE STAFF WORKBENCH

Create a separate professional workspace for service personnel.

Main page title:

“Szolgáltatási munkatér”

Show KPI cards:

Új igények Pontosításra vár Jóváhagyás alatt Megvalósítás alatt SLA-kockázatos Lezárt ebben a hónapban

Create an interactive request table.

Columns:

Azonosító Igény Kategória Szervezeti egység Igénylő Felelős Prioritás Státusz Beküldés Határidő

Filters:

Service category Status Responsible person Organisational unit Priority Date SLA status

Allow views:

“Saját ügyeim” “Új igények” “Csapat ügyei” “SLA-kockázat” “Nagy fejlesztések”

SERVICE CATALOGUE

Create a searchable service catalogue.

Examples:

Microsoft 365 hozzáférés Speciális szoftver igénylése Új munkaállomás Notebook igénylés Monitorcsere Tanszéki honlap módosítása Új webes űrlap Dashboard készítése Automatizált workflow Új belső alkalmazás Adatgyűjtési rendszer AI-megoldás vizsgálata

Each service catalogue entry should contain:

Service description Who can request it Typical delivery time Necessary approvals Required information Responsible unit

Create a button:

“Igény indítása”

If a catalogue item exists, pre-fill relevant information in the request wizard.

DIGITALISATION PROJECT PIPELINE

Distinguish simple tickets from larger digitalisation initiatives.

Create a separate module:

“Fejlesztési portfólió”

Example initiatives:

Hallgatói jelentkezési folyamat digitalizálása Kutatási eszköznyilvántartás Tanszéki dokumentumjóváhagyási workflow Kari rendezvény-regisztráció Oktatási dashboard Klinikai oktatási adatgyűjtés

Each initiative should contain:

Strategic relevance Owner Sponsor Responsible team Stage Expected benefit Estimated cost Estimated effort Dependencies Target date Risk status

Project stages:

Ötlet Előszűrés Koncepció Prioritási döntés Tervezés Fejlesztés Tesztelés Bevezetés Lezárás

MANAGEMENT DASHBOARD

Create a separate page:

“Vezetői áttekintés”

Use visually strong but restrained dashboard components.

Show:

Total incoming requests by month Requests by service category Requests by organisational unit Average completion time SLA compliance Backlog Requests requiring management decision Digitalisation project portfolio Estimated development capacity Estimated cost Completed improvements User satisfaction

Include a section:

“Hol vannak jelenleg szűk keresztmetszetek?”

Example automatically generated insights:

“A szoftverigények átlagos átfutási ideje 18%-kal nőtt az előző hónaphoz képest.”

“Az öt legrégebbi nyitott ügyből három beszerzési jóváhagyásra vár.”

“A digitalizációs fejlesztések 42%-a három szervezeti egységtől érkezik.”

Clearly label these as system-generated insights.

FUNCTION / RESPONSIBILITY MATRIX

Include an administrative module representing the future service mapping work.

Page:

“Szolgáltatások és felelősségek”

Show a matrix:

Service Responsible unit Service owner Operational team Approver Supporting unit SLA Escalation owner

This should make it possible to represent institutional responsibilities independently of individual employees.

ORGANISATIONAL UNITS

Create realistic sample Medical School organisational units, such as:

Dékáni Hivatal Élettani Intézet Anatómiai Intézet Biokémiai és Orvosi Kémiai Intézet Farmakológiai és Farmakoterápiai Intézet Klinikai Központtal együttműködő egységek Oktatási egységek Kutatási egységek

Do not attempt to reproduce the exact real organisational structure.

The prototype should demonstrate the concept rather than encode potentially inaccurate institutional data.

SEARCH

Provide global search.

Placeholder:

“Keresés szolgáltatások, igények és projektek között…”

Search should find:

requests

projects

services

organisational units

documentation

NOTIFICATIONS

Create a notification centre.

Examples:

“DIG-2026-0031 – új ügyintézői üzenet” “SW-2026-0087 – vezetői jóváhagyás szükséges” “WEB-2026-0142 – a feladat elkészült, átvételre vár”

PROFILE

Create a simple profile menu:

Saját profil Saját igények Saját szervezeti egység Értesítési beállítások Kijelentkezés

DATA MODEL

Design a coherent relational data model.

At minimum create entities for:

Users OrganisationalUnits ServiceDomains Services Requests RequestTypes RequestStatuses RequestMessages RequestAttachments Approvals Assignments ServiceTeams Projects Tasks Notifications SLAs Ratings AuditEvents

Create meaningful relationships between them.

AUDITABILITY

The system must record significant actions:

request submission status change assignment approval rejection deadline change classification change responsible person change project conversion closure

Create an audit history visible to authorised staff.

PRIVACY AND SECURITY CONCEPT

Design the system according to enterprise and GDPR-aware principles.

Use role-based access.

Users should only see information necessary for their role.

Sensitive information should not appear unnecessarily in list views.

AI features must not make irreversible decisions autonomously.

AI should support:

request description improvement

classification suggestion

duplicate detection

summarisation

management insights

service recommendation

Every AI recommendation must remain reviewable by a human.

ACCESSIBILITY

Follow WCAG-oriented accessible UI principles.

Forms must have labels.

Do not communicate status only through colour.

Ensure keyboard-friendly interaction.

DEMO DATA

Populate the prototype with enough realistic Hungarian demo data that every page appears functional.

Create approximately:

20–30 service requests

8–12 service catalogue entries

6–8 digitalisation projects

10–15 users

several organisational units

several service teams

Requests should be distributed among multiple statuses.

Make the data realistic and internally consistent.

IMPORTANT UX PRINCIPLE

The ordinary employee should NOT need to understand:

internal organisational boundaries

which service unit is responsible

procurement rules

IT terminology

project management terminology

The system should route the request internally.

The requester describes the problem or desired outcome.

The organisation handles routing and responsibility behind the scenes.

SECOND IMPORTANT UX PRINCIPLE

Do not build an application centred around “tickets”.

Build an application centred around:

“Mit szeretnél elérni?”

The system should translate this into internal service management structures.

NAVIGATION

For an ordinary user use a simple navigation:

Kezdőlap Új igény Igényeim Szolgáltatások Fejlesztések Segítség

For staff add:

Szolgáltatási munkatér Fejlesztési portfólió

For authorised managers add:

Vezetői áttekintés

For administrators add:

Adminisztráció Szolgáltatáskatalógus Szolgáltatások és felelősségek Workflow-k Felhasználók és jogosultságok

BUILD THE FOLLOWING FIRST

Prioritise a convincing clickable prototype of these screens:

Employee home page

New request wizard

Request detail/status page

Service staff workbench

Digitalisation project portfolio

Management dashboard

Service catalogue

Service/responsibility matrix

Do not waste time implementing peripheral settings pages before these core screens work.

INTERACTION REQUIREMENTS

The prototype should be genuinely interactive.

The user must be able to:

submit a request

move through the wizard

save a draft

open existing requests

filter the staff workbench

change request status as staff

approve a request as manager

post a message

add an internal note

view a project

filter dashboards

browse the service catalogue

Use mock backend data or a real lightweight database depending on the platform.

ARCHITECTURAL PRINCIPLE

Keep the application modular so that it could later integrate with:

Microsoft Entra ID Microsoft 365 Power Automate Power BI SharePoint institutional HR systems financial systems procurement systems document management email university APIs

Do not hard-code architectural dependencies unless necessary for the prototype.

FINAL RESULT

Produce a polished, coherent and realistic internal enterprise application prototype that could credibly be shown to:

the Dean, vice-deans, Dean’s Office, IT leadership, service unit heads, administrative leaders, and ordinary departmental employees.

The prototype should make the concept understandable without requiring a presentation explaining it.

The central message of the product should be:

“One entry point for digital needs. Transparent processes. Clear responsibilities. Measurable service quality.”

Start by implementing the employee home page and the complete new-request workflow, then build the staff workspace and management dashboard around the same data model.

## Development

The project uses [Bun](https://bun.sh).

```sh
git clone <this-repository-url>
cd <repository-name>
bun install
bun run dev
```

Further scripts: `bun run build`, `bun run lint`, `bun test`, `bun run format`.
