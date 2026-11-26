/*
 * ============================================================================
 * HydroNode ESP32 Telemetry, Pump Startup & Leak Detection Firmware
 * ============================================================================
 * Combines your physical 4-station rig wiring (from trial.ino) with WiFi,
 * NTP UTC timestamps, 30-second batched HTTPS uploads to your Vercel Next.js
 * dashboard (/api/ingest), pump startup state tracking, and Serial relay control.
 *
 * Hardware Pin Mapping (matching your working trial.ino):
 *   FLOW 1 (S1)     = GPIO 18
 *   FLOW 2 (S2)     = GPIO 19
 *   FLOW 3 (S3)     = GPIO 21
 *   FLOW 4 (S4)     = GPIO 22
 *
 *   PRESSURE 1 (S1) = GPIO 32 (ADC1, direct wiring)
 *   PRESSURE 2 (S2) = GPIO 33 (ADC1, direct wiring)
 *   PRESSURE 3 (S3) = GPIO 34 (ADC1, direct wiring)
 *   PRESSURE 4 (S4) = GPIO 35 (ADC1, direct wiring)
 *
 *   PUMP RELAY      = GPIO 23 (Active HIGH — type ON / OFF in Serial Monitor)
 *
 * Pump Tracking ("off" | "starting" | "running"):
 *   - Enters "starting" for PUMP_STARTUP_MS (6s) either when Serial "ON" is sent
 *     OR automatically when S1 flow rises above PUMP_FLOW_START_LPM (works even
 *     if the pump is powered externally without Serial control).
 *   - Suppresses false leak alerts during "starting" while water primes S1 -> S4.
 *   - Immediately pushes state changes to Vercel so the dashboard shows STARTING.
 * ============================================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

// ============================================================================
// 1. NETWORK & VERCEL API CONFIGURATION (EDIT THESE!)
// ============================================================================
const char* WIFI_SSID      = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD  = "YOUR_WIFI_PASSWORD";

// Your deployed Vercel URL + /api/ingest (NO trailing slash)
// Example: "https://hydronode.vercel.app/api/ingest"
// For local testing on LAN: "http://192.168.x.x:3000/api/ingest"
const char* INGEST_URL     = "https://YOUR-APP.vercel.app/api/ingest";

// Must match INGEST_API_KEY in .env.local AND Vercel Environment Variables
const char* INGEST_API_KEY = "hydronode_secure_ingest_key_2026";
const char* DEVICE_ID      = "esp32-hydronode-01";

// ============================================================================
// 2. PIN DEFINITIONS (from your working trial.ino)
// ============================================================================
const uint8_t FLOW_PINS[4]     = { 18, 19, 21, 22 };
const uint8_t PRESSURE_PINS[4] = { 32, 33, 34, 35 };
const char*   STATION_IDS[4]   = { "S1", "S2", "S3", "S4" };
#define PUMP_RELAY_PIN 23

// ============================================================================
// 3. SENSOR CALIBRATION (ADJUST AFTER WATCHING SERIAL MONITOR!)
// ============================================================================
// Flow sensor factor: YF-S201 uses pulses / 7.5 = L/min (1s window).
const float FLOW_PULSE_FACTOR = 7.5f;

// Pressure sensor calibration (direct wiring to ESP32 ADC1 GPIO 32-35, NO voltage divider):
//   - At rest (Pump OFF / 0 bar), sensors currently read ~200-250 raw ADC.
//   - SENSOR_MAX_BAR: Check what is printed on your sensor casing / listing:
//       "0-1.2 MPa" = 12.0 bar  (most common)
//       "0-1.0 MPa" = 10.0 bar
//       "0-0.5 MPa" =  5.0 bar
//   - ADC_AT_MAX_BAR (no resistor divider):
//       If sensor VCC is 3.3V: max output reaches ~3685-4095 at full rated pressure.
//       If sensor VCC is 5.0V (direct, no divider): WARNING — ESP32 GPIO pins are 3.3V max!
//         Pins clip at ~3.3V (4095); low water rig pressure (< 2 bar) stays under 3.3V,
//         but avoid high pressure (> ~8 bar on a 1.2 MPa sensor) without a divider.
const float ADC_AT_ZERO_BAR = 225.0f;
const float ADC_AT_MAX_BAR  = 4095.0f;
const float SENSOR_MAX_BAR  = 12.0f;

// ============================================================================
// 4. PUMP STARTUP, LEAK DETECTION & UPLOAD CADENCE
// ============================================================================
const unsigned long PUMP_STARTUP_MS          = 6000;  // 6s priming/ramp window ("starting")
const unsigned long PUMP_STOP_DEBOUNCE_MS    = 3000;  // 3s near-zero flow before auto "off"
const float         PUMP_FLOW_START_LPM      = 0.40f; // S1 flow threshold for auto-start detection
const float         PUMP_FLOW_STOP_LPM       = 0.20f; // S1 flow threshold for auto-stop detection

const float FLOW_DIFF_THRESHOLD_LPM  = 1.0f;  // Adjacent station flow drop threshold (L/min)
const float PRESS_DROP_THRESHOLD_BAR = 0.20f; // Adjacent station pressure drop threshold (bar)

const unsigned long SAMPLE_INTERVAL_MS   = 1000;  // Read sensors every 1s (pulse counter window)
const unsigned long SNAPSHOT_EVERY_MS    = 5000;  // Store a batch reading every 5s (6 snapshots / 30s)
const unsigned long UPLOAD_INTERVAL_MS   = 30000; // POST batch to Vercel every 30s
const unsigned long ALERT_COOLDOWN_MS    = 10000; // Minimum gap between immediate leak flushes
const int           MAX_BATCH_SNAPSHOTS  = 12;    // Up to 60s of 5s samples buffered in RAM if WiFi blips

// ============================================================================
// STATE & BUFFERS
// ============================================================================
enum PumpStatus { PUMP_OFF = 0, PUMP_STARTING = 1, PUMP_RUNNING = 2 };

const char* pumpStatusStr(PumpStatus st) {
  switch (st) {
    case PUMP_STARTING: return "starting";
    case PUMP_RUNNING:  return "running";
    default:            return "off";
  }
}

portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;
volatile uint32_t pulseCounts[4] = { 0, 0, 0, 0 };

void IRAM_ATTR isrFlow0() { portENTER_CRITICAL_ISR(&mux); pulseCounts[0]++; portEXIT_CRITICAL_ISR(&mux); }
void IRAM_ATTR isrFlow1() { portENTER_CRITICAL_ISR(&mux); pulseCounts[1]++; portEXIT_CRITICAL_ISR(&mux); }
void IRAM_ATTR isrFlow2() { portENTER_CRITICAL_ISR(&mux); pulseCounts[2]++; portEXIT_CRITICAL_ISR(&mux); }
void IRAM_ATTR isrFlow3() { portENTER_CRITICAL_ISR(&mux); pulseCounts[3]++; portEXIT_CRITICAL_ISR(&mux); }

struct Snapshot {
  char timestamp[25]; // "YYYY-MM-DDTHH:MM:SSZ" or "" if NTP not yet synced
  float flow[4];
  float pressure[4];
};

Snapshot batchBuffer[MAX_BATCH_SNAPSHOTS];
int batchCount = 0;

bool pendingAlert = false;
int  alertStationIdx = 1; // 1 = S2, 2 = S3, 3 = S4
float alertFlowDiff = 0.0f;
float alertPressDrop = 0.0f;
char alertTimestamp[25] = "";

bool relayCommandedOn = false;
PumpStatus pumpStatus = PUMP_OFF;
PumpStatus lastSentPumpStatus = PUMP_OFF;
unsigned long pumpStartedAtMs = 0;
unsigned long zeroFlowSinceMs = 0;

unsigned long lastSampleMs = 0;
unsigned long lastSnapshotMs = 0;
unsigned long lastUploadMs = 0;
unsigned long lastAlertFlushMs = 0;
unsigned long lastPumpPushMs = 0;
unsigned long lastWifiAttemptMs = 0;

// ============================================================================
// HELPERS
// ============================================================================
void getIsoTimestamp(char* out, size_t len) {
  time_t now = time(nullptr);
  if (now < 1700000000) {
    // NTP not synced yet — omit timestamp so /api/ingest safely uses server UTC time
    out[0] = '\0';
    return;
  }
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  strftime(out, len, "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
}

int readAvgAdc(uint8_t pin, int samples = 10) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(200);
  }
  return (int)(sum / samples);
}

float adcToBar(int rawAdc) {
  float span = ADC_AT_MAX_BAR - ADC_AT_ZERO_BAR;
  if (span <= 1.0f) return 0.0f;
  float bar = ((float)rawAdc - ADC_AT_ZERO_BAR) / span * SENSOR_MAX_BAR;
  if (bar < 0.0f) bar = 0.0f;
  if (bar > SENSOR_MAX_BAR) bar = SENSOR_MAX_BAR;
  return bar;
}

void pushSnapshot(const float flows[4], const float pressBar[4]) {
  if (batchCount >= MAX_BATCH_SNAPSHOTS) {
    // Drop oldest sample to keep sliding window in RAM if offline
    for (int k = 1; k < MAX_BATCH_SNAPSHOTS; k++) {
      batchBuffer[k - 1] = batchBuffer[k];
    }
    batchCount = MAX_BATCH_SNAPSHOTS - 1;
  }

  getIsoTimestamp(batchBuffer[batchCount].timestamp, sizeof(batchBuffer[batchCount].timestamp));
  for (int i = 0; i < 4; i++) {
    batchBuffer[batchCount].flow[i] = flows[i];
    batchBuffer[batchCount].pressure[i] = pressBar[i];
  }
  batchCount++;
}

void updatePumpState(unsigned long now, float s1Flow) {
  if (relayCommandedOn) {
    zeroFlowSinceMs = 0;
    if (pumpStatus == PUMP_OFF) {
      pumpStatus = PUMP_STARTING;
      pumpStartedAtMs = now;
    } else if (pumpStatus == PUMP_STARTING && (now - pumpStartedAtMs >= PUMP_STARTUP_MS)) {
      pumpStatus = PUMP_RUNNING;
    }
    return;
  }

  // Fallback automatic detection when pump is switched externally (not via GPIO 23 Serial)
  if (s1Flow >= PUMP_FLOW_START_LPM) {
    zeroFlowSinceMs = 0;
    if (pumpStatus == PUMP_OFF) {
      pumpStatus = PUMP_STARTING;
      pumpStartedAtMs = now;
    } else if (pumpStatus == PUMP_STARTING && (now - pumpStartedAtMs >= PUMP_STARTUP_MS)) {
      pumpStatus = PUMP_RUNNING;
    }
  } else if (s1Flow < PUMP_FLOW_STOP_LPM && pumpStatus != PUMP_OFF) {
    if (zeroFlowSinceMs == 0) {
      zeroFlowSinceMs = now;
    } else if (now - zeroFlowSinceMs >= PUMP_STOP_DEBOUNCE_MS) {
      pumpStatus = PUMP_OFF;
      zeroFlowSinceMs = 0;
    }
  }
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;
  unsigned long now = millis();
  if (now - lastWifiAttemptMs < 10000) return;
  lastWifiAttemptMs = now;
  Serial.println("[WiFi] Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

bool postBatchToServer() {
  if (batchCount == 0) return true;
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipped upload — WiFi offline (keeping buffered samples)");
    return false;
  }

  // Build JSON payload matching src/app/api/ingest/route.ts
  String json;
  json.reserve(batchCount * 360 + 480);

  char sentAt[25];
  getIsoTimestamp(sentAt, sizeof(sentAt));

  json += "{";
  json += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
  json += "\"pumpStatus\":\"" + String(pumpStatusStr(pumpStatus)) + "\",";
  if (sentAt[0] != '\0') {
    json += "\"sentAt\":\"" + String(sentAt) + "\",";
  }

  // Readings array
  json += "\"readings\":[";
  bool firstReading = true;
  for (int b = 0; b < batchCount; b++) {
    for (int s = 0; s < 4; s++) {
      if (!firstReading) json += ",";
      firstReading = false;

      float f = isnan(batchBuffer[b].flow[s]) ? 0.0f : batchBuffer[b].flow[s];
      float p = isnan(batchBuffer[b].pressure[s]) ? 0.0f : batchBuffer[b].pressure[s];

      json += "{\"stationId\":\"";
      json += STATION_IDS[s];
      json += "\",";
      if (batchBuffer[b].timestamp[0] != '\0') {
        json += "\"t\":\"";
        json += batchBuffer[b].timestamp;
        json += "\",";
      }
      json += "\"flow\":" + String(f, 2) + ",";
      json += "\"pressure\":" + String(p, 2) + ",";
      json += "\"vibration\":0}";
    }
  }
  json += "],";

  // Alerts array (if leak condition detected in this window)
  json += "\"alerts\":[";
  if (pendingAlert) {
    json += "{\"stationId\":\"";
    json += STATION_IDS[alertStationIdx];
    json += "\",";
    if (alertTimestamp[0] != '\0') {
      json += "\"t\":\"";
      json += alertTimestamp;
      json += "\",";
    }
    json += "\"confidence\":0.88,";
    json += "\"features\":{";
    json += "\"pressureDropRate\":" + String(alertPressDrop, 3) + ",";
    json += "\"flowDifference\":" + String(alertFlowDiff, 2) + ",";
    json += "\"vibrationRms\":0}}";
  }
  json += "],";

  // Sampling modes
  json += "\"samplingModes\":{";
  for (int s = 0; s < 4; s++) {
    if (s > 0) json += ",";
    const char* mode = (pendingAlert && s == alertStationIdx) ? "elevated" : "normal";
    json += "\"" + String(STATION_IDS[s]) + "\":\"" + String(mode) + "\"";
  }
  json += "}}";

  HTTPClient http;
  http.setTimeout(10000);

  bool began = false;
  WiFiClientSecure secureClient;
  String urlStr(INGEST_URL);

  if (urlStr.startsWith("https://")) {
    // Vercel rotates TLS leaf certificates automatically; setInsecure() avoids manual cert updates
    secureClient.setInsecure();
    began = http.begin(secureClient, urlStr);
  } else {
    began = http.begin(urlStr);
  }

  if (!began) {
    Serial.println("[HTTP] Failed to initialize HTTPClient");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", INGEST_API_KEY);

  int code = http.POST(json);
  String resp = http.getString();
  http.end();

  Serial.printf("[HTTP] POST %d readings (pump=%s) -> status %d | %s\n",
    batchCount * 4, pumpStatusStr(pumpStatus), code, resp.c_str());

  if (code >= 200 && code < 300) {
    batchCount = 0;
    pendingAlert = false;
    lastSentPumpStatus = pumpStatus;
    return true;
  }
  return false;
}

// ============================================================================
// SETUP & LOOP
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(200);

  for (int i = 0; i < 4; i++) {
    pinMode(FLOW_PINS[i], INPUT_PULLUP);
  }
  pinMode(PUMP_RELAY_PIN, OUTPUT);
  digitalWrite(PUMP_RELAY_PIN, LOW); // Active HIGH relay, starts OFF

  // 12-bit ADC attenuation up to ~3.1V on classic ESP32
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  attachInterrupt(digitalPinToInterrupt(FLOW_PINS[0]), isrFlow0, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW_PINS[1]), isrFlow1, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW_PINS[2]), isrFlow2, FALLING);
  attachInterrupt(digitalPinToInterrupt(FLOW_PINS[3]), isrFlow3, FALLING);

  Serial.println("\n========================================");
  Serial.println("HydroNode ESP32 Live Telemetry Starting");
  Serial.println("Serial Commands: ON / OFF (Pump Relay)");
  Serial.println("========================================");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("[WiFi] Connecting");
  unsigned long waitStart = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - waitStart < 15000) {
    delay(400);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.println("[NTP] Syncing UTC time...");
  } else {
    Serial.println("\n[WiFi] Initial connect timed out — will keep retrying in background");
  }

  unsigned long now = millis();
  lastSampleMs = now;
  lastSnapshotMs = now;
  lastUploadMs = now;
}

void loop() {
  ensureWifiConnected();

  // 1) Manual Pump Control via Serial Monitor (matches trial.ino)
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();
    if (cmd == "ON") {
      digitalWrite(PUMP_RELAY_PIN, HIGH);
      relayCommandedOn = true;
      if (pumpStatus == PUMP_OFF) {
        pumpStatus = PUMP_STARTING;
        pumpStartedAtMs = millis();
      }
      Serial.println("[PUMP] STARTING (GPIO 23 HIGH — priming pipeline)");
    } else if (cmd == "OFF") {
      digitalWrite(PUMP_RELAY_PIN, LOW);
      relayCommandedOn = false;
      pumpStatus = PUMP_OFF;
      zeroFlowSinceMs = 0;
      Serial.println("[PUMP] OFF (GPIO 23 LOW)");
    }
  }

  unsigned long now = millis();

  // 2) Every 1 second: read pulse counts, smooth pressure ADC & track pump state
  if (now - lastSampleMs >= SAMPLE_INTERVAL_MS) {
    float dtSec = (float)(now - lastSampleMs) / 1000.0f;
    if (dtSec < 0.1f) dtSec = 1.0f;
    lastSampleMs = now;

    uint32_t p[4];
    portENTER_CRITICAL(&mux);
    for (int i = 0; i < 4; i++) {
      p[i] = pulseCounts[i];
      pulseCounts[i] = 0;
    }
    portEXIT_CRITICAL(&mux);

    float flows[4];
    int   rawAdc[4];
    float pressBar[4];

    for (int i = 0; i < 4; i++) {
      float pulsesPerSec = (float)p[i] / dtSec;
      flows[i] = pulsesPerSec / FLOW_PULSE_FACTOR;
      rawAdc[i] = readAvgAdc(PRESSURE_PINS[i], 10);
      pressBar[i] = adcToBar(rawAdc[i]);
    }

    PumpStatus prevStatus = pumpStatus;
    updatePumpState(now, flows[0]);
    bool pumpStateUnsent = (pumpStatus != lastSentPumpStatus);

    // Print clear calibration + pump telemetry to Serial Monitor every second
    Serial.printf("[Pump:%-8s] ", pumpStatusStr(pumpStatus));
    for (int i = 0; i < 4; i++) {
      Serial.printf("%s:%.2fL/m(adc=%d -> %.2fbar)%s",
        STATION_IDS[i], flows[i], rawAdc[i], pressBar[i], i < 3 ? " | " : "\n");
    }

    // Check adjacent pairs for potential leak — suppressed while pump is STARTING/priming
    float maxFlowDiff = 0.0f;
    float maxPressDrop = 0.0f;
    int   worstIdx = 1;
    bool  leakNow = false;

    if (pumpStatus != PUMP_STARTING) {
      for (int i = 0; i < 3; i++) {
        float fd = flows[i] - flows[i + 1];
        float pd = pressBar[i] - pressBar[i + 1];
        if (fd > FLOW_DIFF_THRESHOLD_LPM && pd > PRESS_DROP_THRESHOLD_BAR) {
          leakNow = true;
          if (fd > maxFlowDiff) {
            maxFlowDiff = fd;
            maxPressDrop = pd;
            worstIdx = i + 1; // Downstream bounding station
          }
        }
      }
    }

    // Store snapshot on schedule OR immediately on pump transition / leak
    bool pumpTransitionDue = pumpStateUnsent && (now - lastPumpPushMs >= 1500);
    bool takeSnapshot = (now - lastSnapshotMs >= SNAPSHOT_EVERY_MS) || leakNow || pumpTransitionDue || (pumpStatus != prevStatus);
    if (takeSnapshot) {
      lastSnapshotMs = now;
      pushSnapshot(flows, pressBar);

      if (leakNow) {
        pendingAlert = true;
        alertStationIdx = worstIdx;
        alertFlowDiff = maxFlowDiff;
        alertPressDrop = maxPressDrop;
        getIsoTimestamp(alertTimestamp, sizeof(alertTimestamp));
        Serial.printf("!!! LEAK DETECTED near %s (dQ=%.2f L/m, dP=%.2f bar) !!!\n",
          STATION_IDS[worstIdx], maxFlowDiff, maxPressDrop);
      }
    }

    // Upload on 30s cadence OR flush immediately on pump state change / new leak
    bool periodicDue = (now - lastUploadMs >= UPLOAD_INTERVAL_MS);
    bool urgentLeakDue = leakNow && (now - lastAlertFlushMs >= ALERT_COOLDOWN_MS);

    if (periodicDue || urgentLeakDue || pumpTransitionDue) {
      if (batchCount == 0) {
        pushSnapshot(flows, pressBar);
      }
      if (postBatchToServer()) {
        lastUploadMs = now;
        if (urgentLeakDue) lastAlertFlushMs = now;
        if (pumpTransitionDue) lastPumpPushMs = now;
      } else {
        // Retry in 5s rather than waiting full 30s if HTTP failed temporarily
        lastUploadMs = now - UPLOAD_INTERVAL_MS + 5000;
        if (pumpTransitionDue) lastPumpPushMs = now;
      }
    }
  }
}
