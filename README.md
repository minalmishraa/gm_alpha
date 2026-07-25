# 🚑 Lifeline — Smart Emergency Response & Intelligent Roadside Alert System

> **A Next-generation, real-time emergency vehicle tracking, roadside alert coordination, and location-aware public warning platform.**

---

## 📋 Table of Contents
1. [System Overview](#-system-overview)
2. [Key Features](#-key-features)
3. [Technology Stack](#-technology-stack)
4. [Role-Based Access & Dashboards](#-role-based-access--dashboards)
5. [Demo Credentials](#-demo-credentials)
6. [Environment Setup & Installation](#-environment-setup--installation)
7. [API Route Reference](#-api-route-reference)
8. [Security & Data Protection](#-security--data-protection)
9. [Multi-Tab Synchronous Demo Guide](#-multi-tab-synchronous-demo-guide)

---

## 🌟 System Overview

**SERIRAS** (Smart Emergency Response & Intelligent Roadside Alert System) solves critical delays in emergency response by:
- Giving drivers an interactive map destination selector with live GPS tracking.
- Calculating real-time vehicle trajectory to notify public users when an emergency vehicle is **"Heading My Way"** within 5 km.
- Broadcasting automated warning messages to IoT roadside LED display boards to clear traffic bottlenecks before ambulances arrive.
- Synchronizing live data seamlessly across multiple browser tabs and role dashboards without page reloads.

---

## ✨ Key Features

### 🗺️ 1. Interactive Map Location Picker
- **Click-to-Pin & Drag**: Click anywhere on the map or drag the destination marker to select exact coordinates.
- **Address & Hospital Search**: Integrated OpenStreetMap Nominatim place lookup.
- **Reverse Geocoding**: Automatically converts selected coordinates into human-readable address names.
- **Auto Device GPS Detection**: Centers the map on the driver/user's live device location upon opening.

### 🚨 2. "Heading My Way" Proximity Alerting
- **Trajectory Filtering**: Uses Haversine distance and route vector math to filter emergencies.
- **Proximity Badges**: Displays dynamic distance alerts:
  - `🚨 Passing right by you (350m away)`
  - `⚠️ Heading towards your location (1.4 km away)`
  - `📍 In your area (3.2 km away)`

### 🛣️ 3. Real-Road Navigation Routing (OSRM)
- Fetches real turn-by-turn road polyline geometry from OpenStreetMap OSRM driving API (`https://router.project-osrm.org/`).
- Smoothly updates ambulance markers without map tearing or flickering.

### 📡 4. Multi-Tab Synchronous Live Tracking
- Utilizes browser `BroadcastChannel` (`seriras_live_sync_channel`) for zero-latency, cross-tab real-time state synchronization.
- Updates Driver, Public, and Admin dashboards simultaneously when GPS ticks or trips start.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework & Core** | **Next.js 16** (App Router & Turbopack), **React 19**, **TypeScript** |
| **Styling & UI** | **Tailwind CSS v4**, Radix UI Primitives, Lucide Icons, Framer Motion, Recharts |
| **Maps & Routing** | Leaflet, React-Leaflet, OpenStreetMap Nominatim & OSRM Routing |
| **Database & ORM** | **SQLite** + **Prisma ORM 6.11.1** |
| **State & Sync** | Zustand Store, Browser `BroadcastChannel` API |
| **Authentication** | NextAuth + `bcryptjs` password hashing |

---

## 👥 Role-Based Access & Dashboards

### 🛡️ 1. Administrator Panel (`ADMIN`)
- **Fleet Verification**: Approve or suspend driver accounts.
- **Emergency Oversight**: Monitor active ambulance trips and analytics.
- **Display Board Monitoring**: Track heartbeat and alert messages on IoT roadside boards.
- **Hospital Management**: CRUD operations for emergency receiving hospitals.

### 🚑 2. Driver Panel (`DRIVER`)
- **Start/End Emergency**: Interactive map picker to select hospital or custom destination.
- **Live Metrics**: Real-time display of speed (km/h), distance remaining (km), ETA, and elapsed time.
- **Auto GPS Streaming**: Continuous device location updates to nearby users and boards.

### 👤 3. Public User Panel (`PUBLIC`)
- **Custom Location Setup**: Single-click device GPS detection or interactive map picker.
- **Heading My Way Filter**: View only emergency vehicles approaching within 5 km of user's active location.
- **Emergency Safety Tips**: Essential guidance on how drivers and pedestrians should give way.

### 📺 4. Roadside Display Board Simulator
- Simulates roadside LED digital displays showing incoming emergency type, ETA, and warnings (e.g. `AMBULANCE APPROACHING - MOVE TO LEFT`).

---

## 🔑 Demo Credentials

| Role | Name | Email | Password | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@lifeline.com` | `admin123` | Active |
| **Driver** | Raj Sharma (Ambulance) | `raj@lifeline.com` | `driver123` | Verified |
| **Driver** | Sita Devi (Ambulance) | `sita@lifeline.com` | `driver123` | Verified |
| **Driver** | Hari Thapa (Fire Brigade) | `hari@lifeline.com` | `driver123` | Verified |
| **Driver** | Gita Magar (Police) | `gita@lifeline.com` | `driver123` | Verified |
| **Driver** | Bikash Rai (Ambulance) | `bikash@lifeline.com` | `driver123` | Pending |
| **Public** | Ram Bahadur | `ram@lifeline.com` | `user123` | Active |
| **Public** | Sita Kumari | `kumari@lifeline.com` | `user123` | Active |

> 💡 **Tip:** Use the quick-access login buttons on the login screen to log in instantly.

---

## ⚡ Environment Setup & Installation

### 1. Requirements
- **Node.js**: v18.0.0 or higher
- **npm** or **bun**

### 2. Environment Configuration ([.env](file:///.env))
Ensure `.env` contains:
```env
DATABASE_URL="file:../db/custom.db"
```

### 3. Setup Commands
Run the following commands in your terminal:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Push Database Schema
npx prisma db push

# 4. Seed Initial Data
npx tsx prisma/seed.ts

# 5. Start Development Server
npm run dev
```

> **Windows PowerShell Note**: If PowerShell blocks running scripts (`npm.ps1 cannot be loaded`), use:
> ```powershell
> npm.cmd run dev
> ```

---

## 📡 API Route Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticates user credentials & returns user profile |
| `POST` | `/api/auth/register` | Registers new public user or driver account |
| `GET` / `POST` / `PUT` | `/api/emergencies` | Create, update position, and fetch active emergencies |
| `GET` / `PUT` | `/api/drivers` | Fetch and verify driver profiles |
| `GET` / `POST` / `PUT` | `/api/boards` | Manage roadside display board status & messages |
| `GET` / `POST` | `/api/hospitals` | Hospital management endpoints |
| `GET` / `PUT` / `DELETE` | `/api/users` | Admin user management |
| `POST` | `/api/gps-simulate` | Simulates vehicle movement towards destinations |

---

## 🛡️ Security & Data Protection

1. **SQL Injection Prevention**: All database access uses **Prisma ORM** parameterized query engine, preventing SQL injection by design.
2. **Password Security**: Hashed using `bcrypt` with salt rounds (`10`).
3. **Data Sanitization**: Password hashes are stripped from all API JSON responses (`const { password: _, ...safeUser } = user`).
4. **HTTP Security Headers**: Enforced in `next.config.ts`:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `X-XSS-Protection: 1; mode=block`

---

## 🎬 Multi-Tab Synchronous Demo Guide

To demonstrate real-time cross-tab synchronization during presentations:

1. Open 3 browser tabs pointing to `http://localhost:3000`.
2. **Tab 1**: Log in as **Driver** (`raj@seriras.com` / `driver123`).
   - Click **Start Emergency** and select a destination on the map.
3. **Tab 2**: Log in as **Public User** (`ram@seriras.com` / `user123`).
   - Click **Detect GPS** or select your location on the map.
   - Observe the **"Heading My Way"** alert update live as the driver moves in Tab 1.
4. **Tab 3**: Log in as **Admin** (`admin@seriras.com` / `admin123`).
   - Monitor the active fleet and IoT roadside boards updating synchronously with zero page refresh!
