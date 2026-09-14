# Stockroom — warehouse prototype

A Turkish, desktop/mobile warehouse prototype for tracking pallet locations and whole-carton stock from receiving through dispatch. Built with React/TypeScript/Vite, Spring Boot 3.5 / Java 21+, Spring Data JPA and PostgreSQL. Phase 1 and Phase 1.1 are complete.

## Start on Windows

Prerequisites: **JDK 21+**, **Node.js 22.12+**, PowerShell, `curl.exe` and `tar.exe`. Run these commands from the project root in separate terminals.

1. Start the database:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/Start-Database.ps1
   ```

   This downloads portable PostgreSQL 17.6 on first use into `.tools`, initializes persistent data under `.local/postgres-data`, and starts a loopback-only server on port **5432**. It creates database `warehouse` with development username/password `warehouse` / `warehouse`. No Windows service is installed. Start this script as your normal Windows user; use the same user on subsequent runs. The helper is for a local demo only.

2. Build and start the backend:

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/Start-Backend.ps1
   ```

   The script uses installed/cached Maven or downloads Maven into `.tools`. API: **http://localhost:8080/api/v1**. To reuse the existing build, add `-SkipBuild`. Flyway creates the schema; demo data is inserted only when both warehouses and products are empty.

3. Start the frontend:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

   Open **http://localhost:5173**. For a phone on the same network, use the network URL printed by Vite; allow port 5173 through your local firewall if needed. All API calls use Vite's proxy, including from mobile devices.

**Demo sign-in:** `admin` / `admin123` or `operator` / `operator123`. Admin manages products and locations. Both roles receive, move and dispatch. An HttpOnly session cookie preserves login across page reloads. Passwords are not kept in browser storage. Logout invalidates the session; sessions expire after eight idle hours or backend restart. All documented credentials are intentionally local prototype defaults, not real secrets.

Stop frontend/backend with Ctrl+C. Stop the portable database separately:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Stop-Database.ps1
```

## Use an existing PostgreSQL installation

Skip the portable database script. Create a `warehouse` login and a database it owns using your DB manager, then set connection variables below. Example SQL, run as a PostgreSQL administrator with each statement outside a transaction:

```sql
CREATE ROLE warehouse LOGIN PASSWORD 'warehouse';
CREATE DATABASE warehouse OWNER warehouse;
```

Standard backend commands with Maven installed:

```powershell
mvn -f backend/pom.xml -DskipTests package
java -jar backend/target/warehouse-0.1.0.jar
```

## Environment

No variables are required with the demo defaults. Set these in the **backend terminal** before starting it; `.env` files are not loaded automatically.

| Variable | Default |
|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/warehouse` |
| `DB_USER` | `warehouse` |
| `DB_PASSWORD` | `warehouse` |
| `PORT` | `8080` |
| `SEED_DEMO` | `true` |
| `ADMIN_PASSWORD` | `admin123` |
| `OPERATOR_PASSWORD` | `operator123` |

Example: `$env:DB_PASSWORD = 'your-local-password'`. If changing backend `PORT`, update the proxy target in `frontend/vite.config.ts`. The portable database script intentionally uses fixed local demo settings.

## Working features

- Product creation, editing, active status and search.
- Warehouse and Zone → Aisle → Rack → Shelf creation; receiving/dispatch staging locations directly under the warehouse.
- Receipt with readable generated pallet IDs, whole-carton quantities and optional references.
- Searchable, paginated inventory with status/location filters and pallet detail.
- Full-pallet relocation within one warehouse, partial/full dispatch, chronological pallet history and global movement history.
- Dashboard counts and recent movements, responsive desktop/mobile screens, visible offline/error states and 20-second read refreshes.
- PostgreSQL transactions, row locking, version checks, nonnegative stock constraints and duplicate operation protection.
- Four demo products, one warehouse, nine hierarchy/staging locations and three active pallets totaling 180 cartons.

## REST checks with Postman

Use **Basic Auth** and `Content-Type: application/json`. Before POST/PUT requests, GET `/api/v1/auth/csrf`, retain its session cookie, and send the returned token using its `headerName` (Postman cookie jar must be enabled). The frontend handles this automatically. POST `/api/v1/auth/logout` ends the session. Routes below are relative to `/api/v1`.

| Method / route | Purpose |
|---|---|
| `GET /auth/me` | Verify credentials and role |
| `GET /products?search=BOX`, `POST /products`, `PUT /products/{id}` | Catalog; writes require Admin |
| `GET /warehouses`, `POST /warehouses` | Warehouses; writes require Admin |
| `GET /locations`, `POST /locations` | Hierarchy with full paths; writes require Admin |
| `GET /inventory?search=&status=ACTIVE&locationId=&page=0` | Pallets, 25 per page; omit empty optional parameters |
| `GET /pallets/{id}` | Current pallet and oldest-first history |
| `POST /receipts` | `{ "productId": 1, "locationId": 1, "quantity": 80, "requestId": "<new UUID>", "reference": "Delivery 123" }` |
| `POST /transfers` | `{ "palletId": 1, "locationId": 6, "version": 0, "requestId": "<new UUID>" }` |
| `POST /dispatches` | `{ "palletId": 1, "quantity": 20, "version": 0, "requestId": "<new UUID>" }` |
| `GET /movements?type=DISPATCH&page=0`, `GET /dashboard` | Global history and live totals |

Use actual product/location IDs from the GET responses. Transfer/dispatch must send the **current pallet version**, returned by receipt, detail and inventory responses. Every command needs a new UUID; reuse that UUID when retrying the same uncertain submission. Already-recorded requests return **409**, without posting a second movement. Refresh after 409 to inspect the saved state. References are optional.

Movement quantities are positive magnitudes: receipt adds, dispatch subtracts, transfer leaves the balance unchanged. `balanceAfter` records the historical remaining cartons. Product details are referenced from the catalog. There are no endpoints to edit/delete movements or directly edit pallet balances.

## Verification and deliberate limits

Frontend production build and backend package build passed. Both servers started against PostgreSQL. A brief REST smoke check through Vite verified 80-carton receiving, partial dispatch to 60, transfer, full dispatch to zero, history, filters, totals, duplicate/stale/overdraw rejection and role restrictions. The completed `PLT-000004` remains as an auditable smoke-check example; the three original demo pallets are unchanged.

Manually verify browser interaction on desktop and phone first, especially the dispatch confirmation and refreshed balance. No automated E2E or extensive test suites were added.

Prototype limits: fixed in-memory accounts, no account-management UI, no password reset, no correction/reversal workflow, no warehouse/location rename or deletion, no interwarehouse transfer, and no offline writes. Basic authentication is for local demonstration; production security is outside this phase. Native PWA installation and offline caching are not implemented. Milestone 2A.1 is complete. Milestone 2A.2 adds labels and HID scanning; 2A.3 is complete (same-operator continuity). Phase 2A.4 and RFID-assisted automation remain later pilots. No hardware integration is included.

## Milestone 2A.1 — completed: software-only continuous receiving

Open **Mal Kabul Kayıtları → Mal Kabul Kaydı Aç**. Select warehouse/staging, optional delivery note, supplier, expected pallet count and note. In the opened record, **Kaydet ve Sonraki Palet** stays on the form; **Önceki Paletle Aynı** reuses the previous product/quantity but requires a new save.

**Yerleştirme Kuyruğu** is shared between users and refreshes every 10 seconds. Select a pallet and use the existing transfer dialog. Gelen / Yerleştirilen counters show receiving and placement progress. Only the first transfer to a shelf sets firstPutAwayAt and marks it placed; moving between staging areas keeps it queued. Later movements do not undo first placement progress. Pallet details link back to the receiving session.

- Migration V3 adds ReceivingSession (`receiving_session`) and nullable pallet session/first-placement fields. Existing pallets and standalone receipts remain compatible.
- API: `GET/POST /api/v1/receiving-sessions`, `GET /api/v1/receiving-sessions/{id}`, `POST /api/v1/receiving-sessions/{id}/complete` with `version` and optional `confirmCountMismatch`.
- Existing `POST /receipts` accepts optional `receivingSessionId`; its location must be the session's staging location. Existing `/transfers` performs placement; movement types are unchanged.
- Completion requires at least one received pallet and no active unplaced pallets. Expected/received count differences require explicit confirmation. Pallets fully dispatched before placement are shown separately. Completed records reject new receipts.
- No session editing/reopening, bulk creation, barcode/QR, camera or RFID is included. The previous-pallet shortcut is local convenience; all received pallets, progress and queue are persisted server-side.

Builds and a short PostgreSQL/API check passed: three receipts, shared queue across Admin/Operator, first placement progression, completion, duplicate rejection, standalone receipt and partial/full dispatch. Browser interaction can be checked with the 3-pallet workflow above using an incognito window or second device for the other operator.

## Milestone 2A.2 — labels and HID-assisted put-away

In a receiving record, open **Hızlı Yerleştirme**. Scan/type the exact pallet code + Enter, verify product/SKU/cartons, then scan/type `LOC-<id>` + Enter. Check the summary and press **Taşımayı Onayla**. Success clears the active pallet and focuses the next pallet input. The queue, progress, manual dropdown and recent destinations remain available. A manually selected queue pallet also supports location scanning. Refresh/navigation does not restore an assumed active pallet.

`GET /api/v1/scan-lookup?code=...` is authenticated and read-only, returning `{ type, pallet, location }` for exact `PLT-...` or `LOC-<id>` identities. Unknown codes return 404. Existing `/transfers`, versions and request IDs handle stock changes; no schema migration was added.

**Etiket Yazdır** is available after receiving, on pallet details/received-pallet rows and on selectable locations. Warehouse headings print all currently filtered valid location labels. The preview offers **Yazdır / PDF Kaydet**. QR and Code 128 encode the same identity; reprints fetch current pallet details without writing stock. Printed carton quantities are a snapshot. Allow the label popup, print at actual size, and verify readability on the intended printer/scanner. Libraries: [node-qrcode](https://github.com/soldair/node-qrcode), [JsBarcode](https://github.com/lindell/JsBarcode).

Frontend/backend builds and a short PostgreSQL API check passed (exact lookup, unknown codes without movements, transfer/progress/history, stale version rejection). The marked smoke record is MK-000004 / PLT-000043. Physical scanner/print acceptance remains manual. Configure HID suffix Enter and matching keyboard layout. No camera, RFID, offline scanning or 2A.3 work is included.

## Phase 2A.3 — same-operator rack-only continuity

Open **Mal Kabul Kayıtları → Mal Kabul Kaydı Aç**. Under "Kesintisiz Palet Girişi", choose the product and quantity, and press **Kaydet ve Yerleştir**.
The exact newly created pallet immediately takes over the UI context as the active placement pallet. The form is hidden, and you are prompted to physically take the pallet and place it on a shelf. 
Scan/type only a valid destination `LOC-<id>` + Enter (without scanning the pallet barcode), check the summary, and press **Taşımayı Onayla**. 
Success clears the active pallet and automatically brings back the receiving form ready for the next product.

The active pallet safety is strict:
- The identity clears completely if the page is reloaded, navigated away from, or the device is locked (using `visibilitychange`).
- A strict 5-minute inactivity timer cancels the active placement context, leaving the untouched pallet safely in the shared queue.
- If network uncertainty occurs (e.g., `Sunucudan onay alınamadı`), the frontend leverages the new idempotent recovery endpoint `GET /api/v1/operations/{requestId}` to resolve the actual committed state rather than guessing. 
- "Aktif Yerleştirmeyi İptal Et" abandons the UI context without affecting the received pallet in the DB.

## Phase 2A.3.1 & 2A.3.2 — Local Warehouse Pilot & Mobile QR Scanning

To run a true multi-device pilot test without cloud infrastructure, the app can be packaged as a single deployable `.jar` that serves both the API and the React SPA securely on `https://<HOST-LAN-IP>:8080/`.

- Build and start using `scripts/Build-Pilot.ps1` and `scripts/Start-Pilot.ps1`.
- The startup script automatically generates a local Root CA (`pilot-ca.cer`) which can be installed on mobile devices to fully trust the self-signed server certificate, satisfying the strict Secure Context (HTTPS) requirements of mobile browser camera APIs.
- Ensure PostgreSQL is safely isolated (`127.0.0.1:5432`) and Windows Defender Firewall allows incoming TCP 8080 traffic on Private networks.
- Operators on mobile devices can now use the "Raf QR Kodunu Okut" action during placement to scan permanent `LOC-<id>` labels using their phone camera, dramatically speeding up the same-operator continuous flow.

*Phase 2A.4 external pallet identifiers not started; camera scanning for pallets not started; no RFID integration.*