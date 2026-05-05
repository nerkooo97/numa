# Appwrite schema za NUMA ERP

Ovaj dokument opisuje šta treba napraviti u Appwrite konzoli da bi `appwriteClient`
radio bez izmjena u UI sloju. Implementacija je već u kodu (`src/data/appwrite/*`),
ali se NE aktivira dok ne postaviš env varijable.

## 1) Env varijable (Vite)

```
VITE_DATA_BACKEND=appwrite
VITE_APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=...
VITE_APPWRITE_DATABASE_ID=numa
VITE_APPWRITE_BUCKET_ID=numa-files
```

Dok god `VITE_DATA_BACKEND` nije `appwrite`, app radi sa lokalnim backendom
(localStorage + IndexedDB) — ništa se ne mijenja.

## 2) Database

Napravi jednu Database, npr. `numa`. Svaki "repo" iz `DataClient`-a ima svoju
collection. Collection ID-evi su definisani u
`src/data/appwrite/collections.ts` i moraju se TAČNO poklopiti.

| Repo (kod)              | Collection ID         |
|-------------------------|-----------------------|
| users                   | `users`               |
| employees               | `employees`           |
| employeeDocuments       | `employee_documents`  |
| projects                | `projects`            |
| projectDocuments        | `project_documents`   |
| phases                  | `phases`              |
| phaseAssignments        | `phase_assignments`   |
| hours                   | `hours`               |
| equipment               | `equipment`           |
| equipmentItems          | `equipment_items`     |
| equipmentCategories     | `equipment_categories`|
| expenses                | `expenses`            |
| cashPayments            | `cash_payments`       |
| cashJustifications      | `cash_justifications` |
| cashbox                 | `cashbox`             |
| audit                   | `audit`               |
| notifications           | `notifications`       |
| visaAttachments         | `visa_attachments`    |
| phaseChecklist          | `phase_checklist`     |
| invoices                | `invoices`            |
| photos                  | `photos`              |

## 3) Atributi po kolekcijama

Atributi se 1:1 mapiraju na TS tipove iz `src/data/types.ts` (re-export iz
`src/features/*/types.ts`). Polje `id` se NE pravi (koristi se Appwrite `$id`).
Polje `createdAt` (string, ISO datum) se čuva kao obični string atribut.

Za svaku kolekciju treba dodati sve atribute iz odgovarajućeg TS interfejsa kao
String (ili Integer/Float/Boolean) atribute u Appwrite konzoli. Sva opcionalna
polja (`field?:`) trebaju biti `required: false`. Brojevi (`number`) se mogu
modelirati kao Float (sigurnije za iznose) ili Integer gdje je primjereno.

Preporučeni indexi za performanse i filtere:

- `employees`: index na `active`, `type`
- `employeeDocuments`: index na `employeeId`, `expiresAt`
- `projects`: index na `active`, `archived`
- `phases`: index na `projectId`, `status`
- `phaseAssignments`: index na `phaseId`, `employeeId`
- `hours`: index na `employeeId`, `projectId`, `phaseId`, `date`, `approved`
- `equipment`: index na `employeeId`, `itemId`
- `expenses`: index na `projectId`, `phaseId`, `category`, `date`
- `cashPayments`: index na `recipientUserId`, `date`, `status`
- `cashJustifications`: index na `cashPaymentId`
- `cashbox`: index na `date`, `type`
- `audit`: index na `userId`, `entityType`, `at`
- `notifications`: index na `read`, `at`
- `invoices`: index na `projectId`, `status`, `date`
- `photos`: index na `projectId`, `phaseId`, `takenAt`

## 4) Permissions (RLS u Appwrite)

Za prvu fazu (zatvorena interna app) najjednostavnije je:
- Collection-level permission: `read("users")`, `create("users")`,
  `update("users")`, `delete("users")` — tj. svi prijavljeni korisnici.
- Granularnu kontrolu po ulozi (admin vs poslovodja) i dalje radi `RequireAuth`
  na frontu kroz `src/config/navigation.ts`.

Po želji se kasnije može uvesti per-document permissions
(npr. `read("user:<id>")`) za striktnu izolaciju.

## 5) Storage

Napravi jedan Bucket, npr. `numa-files`, sa permission za prijavljene korisnike
(`read/create/update/delete` za `users`). FileStore koristi taj bucket za sve
upload-e (skenovi pasoša, ugovori, računi, fotografije faza, itd.).

## 6) Auth

Helperi su u `src/data/appwrite/auth.ts`. Trenutni `AuthContext` koristi
bcrypt + localStorage; kada se aktivira Appwrite backend, `AuthContext` će se
prepravljati da koristi Appwrite Account API i da `User` profil sa `role`-om
čuva u `users` kolekciji (gdje je `id` = Appwrite account `$id`).

Početni admin više se ne kreira lokalno — pravi se ručno u Appwrite konzoli
ili kroz dedicated bootstrap funkciju.

## 7) Aktivacija

1. Kreiraj sve gore navedeno u Appwrite konzoli.
2. Postavi env varijable.
3. Restart dev servera.
4. App će automatski koristiti `appwriteClient` umjesto `localClient`.
   UI komponente ostaju nepromijenjene jer sve ide kroz `db.*` repo API.
