# Project Status

## Phase 1 — Complete
Full prototype: PostgreSQL inventory, product/location/pallet management, pallet receiving with generated IDs, whole-carton stock tracking, paginated inventory search, full-pallet relocation, partial and full dispatch, chronological pallet history, global movement history, and live dashboard.

## Phase 1.1 — Complete
- Turkish UI completed; all labels, validation messages and demo data are in Turkish.
- Receiving, location transfer, partial/full dispatch, inventory and movement history manually verified on desktop and mobile.
- Admin/Operator roles enforced at the API level; CSRF tokens protect all writes.
- Session persistence verified as correctly implemented: Spring Security 6 `DelegatingSecurityContextRepository` reads from HttpSession by default; the JSESSIONID cookie alone restores the authenticated session across page reloads. No auth changes were required.
- Frontend production build and backend package build verified.

## Known Limits
Prototype accounts only (no account management UI), online-only operations, one product per pallet, no lots/expiry tracking, no correction/reversal workflow, no interwarehouse transfers. Sessions expire after eight idle hours or backend restart.

## Next Phase
Milestone 2A.2 has not started. RFID-assisted warehouse automation remains a later pilot; no hardware integration is implemented.

## Milestone 2A.1 — Complete
- ReceivingSession records with delivery/supplier details, expected counts and completion checks.
- Continuous single-pallet receiving with Kaydet ve Sonraki Palet and Önceki Paletle Aynı (previous product/quantity).
- Server-backed shared put-away queue, Gelen / Yerleştirilen progress counters and pallet/session links. firstPutAwayAt is set on first shelf placement; staging transfers do not set it and later transfers preserve it.
- Frontend/backend builds and the three-pallet, two-operator API flow verified.
- No 2A.2 scanning/labels or later hardware milestones implemented. Next step remains manual desktop/mobile acceptance of 2A.1.