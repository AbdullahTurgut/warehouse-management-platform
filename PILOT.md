# Warehouse Pilot Mode Checklist

This pilot mode configuration runs the complete Warehouse Management Platform (React frontend + Spring Boot backend + PostgreSQL) entirely on the local network (LAN) without internet requirements or cloud deployments.

## Architecture

- **PostgreSQL**: Bound securely to `127.0.0.1:5432` (host-only).
- **Backend (Spring Boot)**: Packaged as an executable JAR serving the API on port `8080`, bound to `0.0.0.0` (all interfaces) to allow LAN access.
- **Frontend (React)**: Production-built SPA served directly from the Spring Boot static resources, completely eliminating CORS complexity and development servers.

---

## 1. Before Arriving at the Warehouse

1. **Build Pilot Package**:
   Run the following script to compile the frontend, embed it into the backend static folder, and build the final executable JAR:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/Build-Pilot.ps1
   ```
2. **Verify Laptop Execution**:
   Run the pilot locally and ensure it successfully binds and starts without errors:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/Start-Pilot.ps1
   ```
3. **Verify Login & Sample Receipt**:
   - Open `http://localhost:8080` on the laptop.
   - Login as `operator` / `operator123`.
   - Attempt a dummy receipt and ensure the API responds.

---

## 2. At the Warehouse

1. **Connect to LAN**:
   Ensure the host PC/laptop is connected to the warehouse Wi-Fi or wired LAN.
2. **Configure Firewall** *(If needed)*:
   Ensure Windows Defender Firewall allows incoming TCP traffic on port `8080` for Private networks.
   *Do NOT expose port 5432 or disable the firewall completely.*
3. **Obtain Host LAN IP**:
   Find the correct LAN IPv4 address (e.g. `192.168.1.50`). The startup script will display candidates.
4. **Start Pilot**:
   Run `scripts/Start-Pilot.ps1`.
5. **Connect Mobile Device**:
   Ensure the phone/tablet is connected to the **exact same Wi-Fi network**.
6. **Open Mobile Browser**:
   Navigate to `http://<HOST-LAN-IP>:8080/`.
7. **Verify Login**:
   Sign in as `operator` / `operator123`.
8. **Test Flow**:
   - Open **Mal Kabul Kayıtları → Mal Kabul Kaydı Aç**.
   - Fill in details and test **Kaydet ve Yerleştir**.
   - Verify the exact new pallet appears active.
   - Identify/select a test shelf (`LOC-...`).
   - Confirm placement.
   - Verify inventory/history.

---

## 3. Scanner Test

If a hardware barcode scanner is available for the pilot:
- **Pairing**: Connect the Bluetooth HID scanner to the phone/tablet (or USB to Windows).
- **Scan Test**: With the "Kaydet ve Yerleştir" active pallet screen open, focus the location input.
- Scan a location barcode.
- Verify the scanner transmits the `LOC-<id>` text and appends the `Enter` suffix, advancing the workflow accurately.

---

## 4. After Test

- **Record Issues**: Note any UI sizing problems, network drops, or workflow confusion.
- **Safely Stop**:
  Run the shutdown script to gracefully terminate the Java process and safely stop PostgreSQL:
  ```powershell
  powershell -ExecutionPolicy Bypass -File scripts/Stop-Pilot.ps1
  ```
- **Preserve Database**: 
  The `.local/postgres-data` folder retains the database exactly as it was. Do not delete it if you need to investigate pilot data.

---

## Known Limitations

- Fixed in-memory demo accounts are used.
- Passwords are in plain text configurations in `application.properties`. Do not use for real production.
- HTTP is used instead of HTTPS. Proceed cautiously on shared networks.
- No hardware integration (like Bluetooth direct APIs, RFID, or native apps) is enabled.
