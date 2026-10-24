# Mobile app startup (Expo Go)

The mobile project uses npm, Expo SDK 58, and the standard Expo Go app. Node
22.13 or newer is required; Node 22 LTS is recommended.

## 1. Configure and start the backend

The API requires a real MongoDB database. From Windows PowerShell:

```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\api
npm install
Copy-Item .env.example .env
notepad .env
```

Set `MONGO_URI` to either a reachable MongoDB Atlas connection string or a
local MongoDB instance. Set `JWT_SECRET` to a long random value. Do not put
either value in the Expo app environment.

The remaining development values should be:

```dotenv
HOST=0.0.0.0
PORT=5000
NODE_ENV=development
```

Initialize sample data once, then start the API:

```powershell
npm run seed
npm run dev
```

Verify it on the computer:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/
```

The response should contain `status: ok`. The server listens on all network
interfaces so a phone on the same LAN can use it.

## 2. Configure the phone-reachable API URL

Find the active Wi-Fi or Ethernet IPv4 address:

```powershell
ipconfig
```

Copy `app/.env.example` to the ignored local environment file and replace the
example IP with that address:

```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\app
Copy-Item .env.example .env.local
notepad .env.local
```

Example:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.29.174:5000/api
```

Do not use `localhost` or `127.0.0.1`: on a physical phone those names refer
to the phone, not the development computer. The current machine address at
the time of this repair was `192.168.29.174`; update the file if DHCP changes
it.

## 3. Start Expo and scan the development QR code

Keep the backend terminal running. Open a second PowerShell terminal:

```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\app
npm install
npm run check
npm run start:clear
```

Scan the QR code printed by `expo start` (the Metro development-server QR),
not a QR code displayed inside the GreenPoint app.

- Android: open Expo Go and choose **Scan QR code**.
- iPhone: sign in to the same Expo account in Expo CLI and Expo Go if asked,
  then scan with the Camera app or open the project from Expo Go.

The phone and computer must be on the same non-isolated Wi-Fi/LAN. Allow Node
through Windows Defender Firewall on private networks when prompted.

## Tunnel fallback

If the phone cannot reach Metro over LAN:

```powershell
cd C:\Users\dyara\GreenPoint_Mumbai\app
npm run start:tunnel
```

The Expo tunnel exposes Metro only. It does not expose the Express API. The
phone must still reach `EXPO_PUBLIC_API_URL` over LAN, or that variable must
point to a separately secured/public API endpoint.

## Quick connection checks

1. On the phone browser, open `http://<COMPUTER-IP>:5000/`. It must return the
   API health JSON before login can work.
2. Confirm Expo Go and this project use the same SDK (58).
3. Stop Metro with Ctrl+C, run `npm run start:clear`, and scan the new QR.
4. Disable VPN/client isolation temporarily and verify both devices are on the
   same subnet.
5. If Metro LAN still fails, use `npm run start:tunnel`; if only login fails,
   fix API reachability rather than changing the Metro connection mode.
