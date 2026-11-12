# HydroNode · IoT Pipeline Leak Detection & Localization SCADA

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Neon Database](https://img.shields.io/badge/Neon-PostgreSQL-00e599?style=flat&logo=postgresql)](https://neon.tech/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-c5f74f?style=flat)](https://orm.drizzle.team/)
[![SDG 6](https://img.shields.io/badge/UN%20SDG-6%3A%20Clean%20Water-00aed9?style=flat)](https://sdgs.un.org/goals/goal6)

> **Autonomous acoustic & hydraulic pipe leak localization SCADA platform powered by edge-multiplexed ESP32-S3 microcontrollers and serverless PostgreSQL.**

---

## 🌊 Overview

**HydroNode** is an industrial-grade Supervisory Control and Data Acquisition (SCADA) and IoT telemetry platform engineered to monitor pressurized water distribution pipeline networks. Built as an applied engineering capstone addressing **UN Sustainable Development Goal 6 (Clean Water and Sanitation)**, HydroNode detects and localizes subsurface pipe orifice breaches in under **4.2 seconds** while eliminating false positives from pump transients and consumption surges.

The system combines:
1. **Physical Serpentine Test Rig**: A continuous 1/2" Schedule-40 PVC closed-loop pipeline partitioned into 5 monitored zones ($Z_1$–$Z_5$) bounded by 6 instrumented sensor stations ($S_1$–$S_6$).
2. **Tri-Sensor Pod Architecture**: At every station boundary, a multi-transducer pod records line pressure (piezoresistive), volumetric flow rate (pulse turbine), and elastic acoustic stress waves (piezoelectric film).
3. **Edge Inference Engine**: ESP32-S3 edge microcontrollers running an on-device Random Forest classifier and adaptive sampling (10 Hz nominal $\to$ 100 Hz surge).
4. **Ultra-Premium SCADA Dashboard**: Built with Next.js 16 (App Router + Turbopack) featuring a modern luxury light-mode design system, live vector rig schematics, high-frequency oscillograms, GIS corridor mapping, and simulation controls.

---

## 🛠️ Physical Test Rig & Hardware BOM

The HydroNode laboratory testbench is instrumented with industrial-grade components multiplexed back to the central ESP32-S3 controller:

```
[Supply Tank] ──► [JT-800D 24V Pump] ──► [S1] ──(Zone 1)──► [S2] ──(Zone 2)──► [S3]
                                          ▲                  ▲                  ▲
                                          │                  │                  │
[ESP32-S3 Controller Enclosure] ◄─────────┴──────────────────┴──────────────────┘
   (Random Forest Edge AI)               2 AWG Shielded Multi-Conductor Signal Cables
                                          │                  │                  │
[Collection Tank] ◄────────────────────── [S6] ◄─(Zone 5)── [S5] ◄─(Zone 4)── [S4]
```

### Component Specifications

| Subsystem | Component | Specifications / Role |
| :--- | :--- | :--- |
| **Edge Controller** | **ESP32-S3-DevKitC-1U-N8R8** | Dual-core Xtensa LX7 @ 240 MHz, 8 MB Flash, 8 MB PSRAM. Executes on-device Random Forest inference and adaptive sampling loops. |
| **Circulation Pump** | **JT-800D 24V DC Centrifugal** | 800 L/h rated flow, 5–7m head pressure capability. Prime hydraulic feed for the 1/2" PVC serpentine loop. |
| **Pump Driver** | **LR7843 MOSFET PWM Module** | Optocoupled 3.3V GPIO gate driver controlling 24V DC brushless pump throttle (0–100% duty cycle via `ledcWrite`). |
| **Flow Transducers** | **Hall-Effect Turbine Meters** | 1,200 pulses/L calibration factor. Optocoupled via **EL817** (5V $\to$ 3.3V) feeding ESP32 hardware pulse interrupts. |
| **Pressure Transducers** | **5V Piezoresistive Transducers** | 0–1.2 MPa (0.5–4.5V output) scaled via 10kΩ/20kΩ precision resistor dividers into dual **ADS1115 16-bit I²C ADCs**. |
| **Seismic Wave Sensors**| **Piezoelectric Film Modules** | Captures 60–240 Hz elastic pipe-wall acoustic emission stress waves from turbulent orifice jetting; isolated via **EL817** optocouplers. |
| **Signal Cabling** | **2 AWG Shielded Multi-Conductor** | High-noise-immunity physical bus linking S1–S6 stations to the central IP65 electrical enclosure. |
| **Plumbing Loop** | **1/2" Schedule-40 Rigid PVC** | 5 discrete test segments (1.2m each) with 4–6" flexible silicone motor coupling to dampen pump cavitation hum. |

---

## 🧠 Algorithmic Detection & Machine Learning

HydroNode implements a hybrid hydraulic-acoustic verification protocol to eliminate false alarms:

### 1. Mass Balance Flow Imbalance
Continuous monitoring of neighboring station differentials flags fluid loss:
$$\Delta Q = Q_{up} - Q_{down}$$
Where $Q_{up}$ is the upstream station flow and $Q_{down}$ is downstream. An imbalance exceeding the calibrated threshold flags the intermediate zone.

### 2. Pressure Severity Index (SI)
Evaluates sudden and gradual pressure drops relative to nominal steady-state baseline:
$$SI = \left(\frac{P_0 - P_{measured}}{P_0}\right) \times 100\%$$
- **Low Severity** ($SI < 5\%$): Micro-fissures / pinhole weepage.
- **Medium Severity** ($5\% \le SI < 10\%$): Moderate pipe wall crack; automated maintenance dispatch.
- **High Severity** ($SI \ge 10\%$): Major burst; immediate pump shutdown recommendation.

### 3. Acoustic Emission & FFT Spectral Verification
Piezoelectric sensors monitor the high-frequency structural acoustic band (**60–120 Hz**). During an orifice breach:
- Acoustic RMS energy spikes above the **0.150 g** alarm threshold.
- The coincidence of high acoustic RMS + flow imbalance differentiates true pipe wall breaches from normal hydraulic consumption surges or pump motor transients.

### 4. Adaptive Sampling Rate
- **Nominal State**: 10 Hz edge polling minimizes telemetry overhead and power consumption.
- **Elevated State**: Automatically surges to **100 Hz** upon detecting anomalous acoustic wave packets to pinpoint wavefront arrival time.

---

## 🎨 SCADA Design System (Modern Light Mode)

HydroNode features an ultra-premium, industrial SaaS user interface adhering strictly to the **20 Rules to Unslop AI UI**:

- **Warm-Neutral Canvas**: Soft `#f1f3f6` canvas with crisp, pure white (`#ffffff`) floating cards and velvety diffused shadows (`.shadow-premium`).
- **Fluted Barcode Accents**: Repeating vertical pinstripe bars (`.pattern-fluted`) inspired by high-end design standards.
- **Hero Pipeline Rig Canvas**: Interactive SVG blueprint with real-time fluid flow animation, station status indicators, and side inspection drawers.
- **Active Pipeline Zones Table**: High-contrast tabular telemetry with pastel rounded-square icons per zone and soft pill badges.
- **Digital Seismogram & FFT Spectrum**: Sub-second oscillogram traces capturing zero-baseline wave oscillations and spectral band energies.
- **GIS Municipal Corridor**: Leaflet + OpenStreetMap projection tracking real-world distribution lines across Caloocan City, Philippines.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20.x or higher
- **npm**, **pnpm**, or **yarn**
- **PostgreSQL Database** (e.g., [Neon Serverless Postgres](https://neon.tech))

### 1. Clone the Repository
```bash
git clone https://github.com/veth14/HydroNode.git
cd HydroNode
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the project root:
```env
# Neon PostgreSQL Connection String
DATABASE_URL="postgresql://<user>:<password>@<neon-host>/hydronode?sslmode=require"

# (Optional) Edge Ingestion Secret Token
INGEST_SECRET="your-secure-ingest-key"
```

### 4. Database Setup & Seeding
Push the schema to Neon and seed initial baseline calibration records:
```bash
# Push schema tables (stations, readings, alerts, settings)
npm run db:push

# Seed default baseline values for S1–S6 and active alerts
npm run db:seed
```

### 5. Launch the SCADA Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Simulation & Testing Bench

HydroNode provides integrated test tools to validate the pipeline without physical hardware attached:

1. **In-Dashboard Simulation**:
   - Navigate to `/simulation` or click **"+ Simulate Leak"** on the dashboard.
   - Select a target Zone (1–5) and magnitude (*Small*, *Medium*, *Large*).
   - Adjust the **24V Pump PWM throttle** (0–255 duty cycle) or test closed-loop PID auto-balancing.
2. **CLI Test Batch Generator**:
   ```bash
   npm run test:send
   ```
   Simulates 210 high-frequency sensor telemetry packets and posts them directly to `/api/ingest`.

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/ingest` | `POST` | Primary edge telemetry ingest point for ESP32-S3 batches. |
| `/api/stations` | `GET` | Returns real-time health, sampling mode, and latest metrics for stations S1–S6. |
| `/api/readings` | `GET` | Historical telemetry query supporting ranges (`1h`, `24h`, `7d`, `30d`) and raw data. |
| `/api/alerts` | `GET`, `POST` | Retrieve active leak alarms with severity filtering and triage notes. |
| `/api/alerts/[id]` | `PATCH` | Update alert triage lifecycle (`active` $\to$ `acknowledged` $\to$ `resolved`). |
| `/api/simulate` | `POST` | Injects synthetic hydraulic orifice leaks and pump transients into the rig. |
| `/api/settings` | `GET`, `PUT` | Read and update sensor baseline parameters ($Q_0, P_0$) and alarm thresholds. |
| `/api/db-usage` | `GET` | Monitors database row counts, table disk footprint, and retention quotas. |

---

## 📁 Repository Structure

```
HydroNode/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (dashboard)/          # Authenticated SCADA workspace
│   │   │   ├── page.tsx          # Main Network Overview & Rig Canvas
│   │   │   ├── alerts/           # Incident Log & Event Triage
│   │   │   ├── stations/[id]/    # Per-station high-frequency telemetry & FFT
│   │   │   ├── simulation/       # Testbench leak injector & PWM pump controller
│   │   │   ├── analysis/         # Hydraulic calculator & ML model details
│   │   │   ├── site-map/         # GIS Leaflet municipal pipeline corridor
│   │   │   ├── evaluation/       # Benchmark accuracy & empirical trials
│   │   │   └── settings/         # Baseline calibration & severity thresholds
│   │   ├── api/                  # Serverless REST endpoints
│   │   └── globals.css           # Design tokens, fluted patterns, and surfaces
│   ├── components/
│   │   ├── charts/               # Recharts Seismograms & FFT Power Spectrums
│   │   ├── layout/               # Sidebar, TopBar, and Navigation Shell
│   │   ├── map/                  # Leaflet OpenStreetMap GIS integration
│   │   ├── rig/                  # SVG Serpentine Rig Schematics & Transducers
│   │   └── ui/                   # Luxury UI Primitives (Card, Button, Stat, Badge)
│   ├── config/
│   │   └── rig.ts                # Rig geometry, station coordinates & zone bounds
│   ├── db/
│   │   ├── schema.ts             # Drizzle PostgreSQL relational schema
│   │   └── seed.ts               # Database baseline seed script
│   ├── lib/
│   │   └── leakLogic.ts          # Severity index & leak rate classification algorithms
│   └── store/
│       └── hydroStore.ts         # Zustand global state & client cache
├── scripts/
│   └── send-test-batch.ts        # CLI synthetic telemetry generator
├── drizzle.config.ts             # Drizzle ORM configuration
└── package.json
```

---

## 📜 License & Acknowledgments

- **License**: MIT License. See [LICENSE](LICENSE) for details.
- **Capstone Initiative**: Developed in support of **United Nations Sustainable Development Goal 6 (Clean Water & Sanitation)** to minimize municipal non-revenue water (NRW) loss.
