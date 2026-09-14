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
Phase 2A.2 is complete. Phase 2A.3 camera scanning has not started. RFID-assisted warehouse automation remains a later pilot.

## Milestone 2A.1 — Complete
- ReceivingSession records with delivery/supplier details, expected counts and completion checks.
- Continuous single-pallet receiving with Kaydet ve Sonraki Palet and Önceki Paletle Aynı (previous product/quantity).
- Server-backed shared put-away queue, Gelen / Yerleştirilen progress counters and pallet/session links. firstPutAwayAt is set on first shelf placement; staging transfers do not set it and later transfers preserve it.
- Frontend/backend builds and the three-pallet, two-operator API flow verified.
- Scanning and labels were outside 2A.1; see the completed 2A.2 checkpoint below.

## Phase 2A.2 — Complete
- Exact read-only pallet/location scan lookup; no schema changes.
- HID/manual barcode workflow completed: code + Enter, pallet verification, destination scan, explicit existing transfer confirmation and next-pallet focus.
- Pallet/location QR + Code 128 label printing completed, including read-only reprinting and filtered location batch printing.
- Existing manual flow, shared queue, counters and recent destination shortcuts retained.
- Frontend/backend builds and brief PostgreSQL API verification passed. Physical HID scanner and printer have not yet been validated.

## Phase 2A.3 — Complete
- Added "Kaydet ve Yerleştir" for same-operator rack-only placement with zero pallet scans in an uninterrupted controlled flow.
- Active pallet identity is temporarily stored in UI state (clears on reload, navigation, 5 minutes idle, conflicting states, or explicitly via "İptal Et").
- Network uncertainty handled correctly using a new `GET /api/v1/operations/{requestId}` idempotent recovery endpoint.
- Phase 2A.4 external pallet identifiers not started; camera scanning not started; no RFID integration.