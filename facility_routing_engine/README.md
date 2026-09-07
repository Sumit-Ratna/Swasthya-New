# 🏥 Facility Distance & Routing Engine

A production-ready, standalone, and fault-tolerant routing engine designed for healthcare systems. It calculates actual road distances, estimated travel times, and distance-ranked facility queues between patients and medical facilities using **OpenStreetMap (OSM)** data, **OSRM (Open Source Routing Machine)**, and an explicit **Haversine geodesic fallback**.

---

## 🏗️ 1. Architecture Overview

```
[Patient Coordinates] + [Healthcare Facilities]
                    │
                    ▼
       ┌────────────────────────┐
       │   Validators & DTOs    │ (Bounds, Type, Payload Checks)
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │  Nominatim Geocoding   │ (Address -> Coordinates if missing, Rate-Limited)
       └────────────┬───────────┘
                    │
                    ▼
       ┌────────────────────────┐
       │      RouteCache        │ (Memory Cache, TTL, Lat/Lng Precision Keying)
       └────────────┬───────────┘
            Cache   │  Cache
            Miss    │  Hit
         ┌──────────┴──────────┐
         ▼                     ▼
┌──────────────────┐    [Return Cached
│    OSRMClient    │     RouteInfo]
│ (Concurrency     │
│  Pool, Retries)  │
└────────┬─────────┘
         │
    ┌────┴────────────────┐
Success                  Error / Timeout
    │                             │
    ▼                             ▼
[Normalize              ┌────────────────────┐
 Road Distance]         │ DistanceCalculator │ (Explicit Haversine Fallback)
                        │ (HAVERSINE_SOURCE) │
                        └─────────┬──────────┘
                                  │
    ┌─────────────────────────────┘
    ▼
┌────────────────────────┐
│ Facility Sorter &      │ (Rank 1..N, Nearest Detection, Geometry,
│ Result Assembler       │  Metrics, Summary)
└────────────┬───────────┘
             │
             ▼
[Standardized RoutingResult Output Contract]
```

---

## 📁 2. Folder Structure

```
facility_routing_engine/
├── package.json                   # Standalone package definition and test scripts
├── .env.example                   # Environment configuration template
├── README.md                      # Complete architecture & integration documentation
├── src/
│   ├── index.js                   # Unified Public API exports & factory
│   ├── config/
│   │   └── config.js              # Environment settings & sensible defaults
│   ├── models/
│   │   ├── Coordinates.js         # Coordinate value object with lat/lng normalization
│   │   ├── Facility.js            # Facility entity with ID, name, coordinates, type
│   │   ├── RouteInfo.js           # Standardized route result (distance, duration, source)
│   │   ├── RoutingRequest.js      # Input DTO with validation bindings
│   │   └── RoutingResult.js       # Standardized output contract DTO
│   ├── clients/
│   │   ├── OSRMClient.js          # Dedicated OSRM HTTP client with retries and error parsing
│   │   └── GeocodingClient.js     # OSM Nominatim geocoder with 1 req/sec rate limit & cache
│   ├── services/
│   │   ├── RoutingService.js      # Core orchestrator: batch routing, ranking, type filtering
│   │   └── DistanceCalculator.js  # Haversine straight-line geodesic fallback calculator
│   ├── cache/
│   │   └── RouteCache.js          # In-memory LRU/TTL cache with coordinate rounding
│   ├── utils/
│   │   ├── validators.js          # Strict lat/lng [-90,90], [-180,180] & payload validators
│   │   ├── formatters.js          # Meters/Km and Seconds/Minutes human-readable formatters
│   │   ├── concurrency.js         # Bounded Promise pool concurrency queue
│   │   └── logger.js              # Structured JSON logger with privacy coordinate fuzzing
│   └── errors/
│       └── index.js               # Error hierarchy (ValidationError, OSRMUnavailableError, etc.)
├── tests/
│   ├── unit/
│   │   ├── validators.test.js     # Validation logic & edge cases
│   │   ├── haversine.test.js      # Geodesic formula accuracy tests
│   │   ├── osrmParser.test.js     # OSRM response parsing and error codes
│   │   ├── cache.test.js          # TTL expiry, LRU eviction, and hit ratios
│   │   ├── facilitySorting.test.js# Road distance sorting and rank ordering
│   │   └── geocoding.test.js      # Address resolution and caching
│   └── integration/
│       ├── routingService.test.js # Multi-facility batch calculations and type filtering
│       └── fallback.test.js       # Fault-tolerance and partial failure resilience
└── examples/
    ├── demo.js                    # Interactive CLI demonstration
    └── sample-batch-request.json  # Reference request payload
```

---

## ⚙️ 3. Setup Instructions

### Prerequisites
- Node.js `v18.0.0` or higher (uses native `fetch` and native test runner).

### Installation
```bash
cd facility_routing_engine
# (Optional) Copy environment template
cp .env.example .env
```

---

## 🔐 4. Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OSRM_BASE_URL` | `https://router.project-osrm.org` | OSRM server endpoint (self-hosted recommended in prod) |
| `OSRM_TIMEOUT_MS` | `6000` | HTTP timeout for OSRM route calculation in ms |
| `NOMINATIM_BASE_URL` | `https://nominatim.openstreetmap.org` | OpenStreetMap Nominatim geocoding URL |
| `NOMINATIM_USER_AGENT`| `FacilityDistanceEngine/1.0` | Mandatory User-Agent header per OSM policy |
| `NOMINATIM_RATE_LIMIT_MS`| `1000` | Minimum interval between geocoding requests (ms) |
| `CACHE_TTL_MS` | `1800000` (30 mins) | Time-to-Live for cached routes in ms |
| `CACHE_MAX_ENTRIES` | `10000` | Maximum route entries in LRU cache |
| `ROUTING_CONCURRENCY_LIMIT`| `5` | Maximum parallel OSRM requests in batch calculation |
| `DEFAULT_ROUTING_PROFILE` | `driving` | Default profile (`driving`, `walking`, `cycling`) |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warn`, `error`) |

---

## 📑 5. API / Interface Contract

### Input Schema (`RoutingRequest`)
```json
{
  "origin": {
    "latitude": 28.6139,
    "longitude": 77.2090
  },
  "profile": "driving",
  "filterType": "TERTIARY_HOSPITAL",
  "includeGeometry": true,
  "enableFallback": true,
  "facilities": [
    {
      "id": "FAC-001",
      "name": "Dr. Ram Manohar Lohia Hospital",
      "type": "TERTIARY_HOSPITAL",
      "latitude": 28.6247,
      "longitude": 77.2023
    },
    {
      "id": "FAC-002",
      "name": "Connaught Place Clinic",
      "type": "CLINIC",
      "address": "Connaught Place, New Delhi"
    }
  ]
}
```

### Output Schema (`RoutingResult`)
```json
{
  "origin": {
    "latitude": 28.6139,
    "longitude": 77.209
  },
  "profile": "driving",
  "summary": {
    "totalRequested": 2,
    "totalEvaluated": 2,
    "successfulRoutes": 2,
    "fallbackRoutes": 0,
    "failedRoutes": 0
  },
  "nearestFacility": {
    "id": "FAC-001",
    "name": "Dr. Ram Manohar Lohia Hospital",
    "type": "TERTIARY_HOSPITAL",
    "address": null,
    "latitude": 28.6247,
    "longitude": 77.2023,
    "distanceMeters": 2140,
    "distanceKm": 2.14,
    "distanceFormatted": "2.14 km",
    "durationSeconds": 380,
    "durationMinutes": 6,
    "durationFormatted": "6 min",
    "distanceSource": "OSRM",
    "status": "SUCCESS",
    "cached": false,
    "rank": 1
  },
  "facilities": [
    {
      "id": "FAC-001",
      "name": "Dr. Ram Manohar Lohia Hospital",
      "type": "TERTIARY_HOSPITAL",
      "distanceMeters": 2140,
      "distanceKm": 2.14,
      "distanceFormatted": "2.14 km",
      "durationSeconds": 380,
      "durationMinutes": 6,
      "durationFormatted": "6 min",
      "distanceSource": "OSRM",
      "status": "SUCCESS",
      "cached": false,
      "rank": 1
    }
  ],
  "metadata": {
    "engine": "Facility Distance & Routing Engine (OSM / OSRM)",
    "calculatedAt": "2026-09-07T16:00:00.000Z",
    "executionLatencyMs": 142,
    "cacheStats": {
      "size": 1,
      "hits": 0,
      "misses": 1,
      "hitRatio": 0
    }
  }
}
```

---

## 🧪 6. Testing Instructions

Run the complete automated test suite (Unit + Integration tests):
```bash
npm test
```

Run the interactive manual demo:
```bash
npm run demo
```

---

## 🛡️ 7. Error Handling & Fallback Strategy

1. **Validation Rejection**: Latitude/Longitude bounds ([-90, 90], [-180, 180]) are validated prior to any network call.
2. **Graceful Partial Failure**: If 1 facility among 100 has invalid coordinates or an unreachable location, it is tagged as `ROUTING_FAILED` without failing the remaining 99 facilities.
3. **Honest Fallback Marker**: If OSRM is down, `DistanceCalculator` computes the Haversine distance with a `1.25x` road circuity factor and clearly marks `distanceSource: "HAVERSINE_FALLBACK"`. It **never** disguises a straight line as an OSRM road distance.

---

## ⚡ 8. Caching Strategy

- **Key Construction**: Origin coordinates rounded to 5 decimals (~1.1m precision) + Destination coordinates + Profile:
  `28.61390,77.20900->28.62470,77.20230->driving`
- **TTL Expiration**: Automatically purges stale routes after 30 minutes.
- **LRU Protection**: Automatically evicts the oldest entries once max capacity (10,000 entries) is reached.

---

## 🚀 9. Future Integration Guide

To integrate this module into any Express/Fastify/NestJS healthcare application:

```javascript
// 1. Import from module
const { createRoutingEngine } = require('./facility_routing_engine/src');

// 2. Instantiate engine
const routingEngine = createRoutingEngine({
    osrm: { baseUrl: process.env.OSRM_BASE_URL },
    cache: { ttlMs: 1800000 }
});

// 3. Use inside any route/controller
app.post('/api/patient/nearest-facilities', async (req, res) => {
    try {
        const result = await routingEngine.calculateFacilityRoutes({
            origin: req.body.patientLocation,
            facilities: req.body.facilities,
            filterType: req.query.type || null
        });
        res.json(result);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message, code: err.code });
    }
});
```
