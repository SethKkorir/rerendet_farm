# Rerendet Farm — System Monitoring Guide

This document describes how to configure external uptime monitoring, integrate with the built-in health-check infrastructure, and set up alerts for the Rerendet Farm platform.

---

## Table of Contents

1. [Health Endpoint Overview](#health-endpoint-overview)
2. [UptimeRobot Setup](#uptimerobot-setup)
3. [Expected Response Format](#expected-response-format)
4. [Alert Configuration](#alert-configuration)
5. [Dashboard Integration](#dashboard-integration)
6. [Internal Health Monitoring Loop](#internal-health-monitoring-loop)

---

## Health Endpoint Overview

Rerendet Farm exposes a public health-check endpoint that verifies the availability of all critical backend services:

```
GET /api/health
```

**No authentication is required.** This endpoint is designed for external monitoring tools.

### Services Checked

| Service     | Check Method                         | Timeout Behavior       |
|-------------|--------------------------------------|------------------------|
| MongoDB     | `mongoose.connection.readyState` + `admin().ping()` | Fails if readyState ≠ 1 or ping throws |
| Redis       | `redisClient.ping()`                 | Fails if client is disconnected or ping throws |
| BullMQ      | `emailQueue.getJobCounts()`          | Fails if queue is not initialized or throws |
| Cloudinary  | `cloudinary.api.ping()`              | Fails if API key is misconfigured or unreachable |

---

## UptimeRobot Setup

[UptimeRobot](https://uptimerobot.com) is a free/paid external monitoring service that can poll your health endpoint at regular intervals.

### Step-by-Step Configuration

1. **Create an account** at [https://uptimerobot.com](https://uptimerobot.com).

2. **Add a new monitor:**
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Rerendet Farm Health`
   - **URL:** `https://your-domain.com/api/health`
   - **Monitoring Interval:** 5 minutes (free tier) or 1 minute (Pro)

3. **Configure keyword monitoring (recommended):**
   - **Monitor Type:** HTTP(s) — Keyword
   - **Keyword:** `"status":"healthy"`
   - **Keyword Type:** Keyword Exists
   - This ensures the monitor alerts when the response body does _not_ contain a healthy status.

4. **Set expected status code:**
   - **Expected HTTP Status:** `200`
   - The endpoint returns `200` even when services are degraded (check the JSON body for `status: "unhealthy"`), but returns `503` when overall status is unhealthy.

5. **Save** the monitor.

### Recommended Monitors

| Monitor Name            | URL                                | Type     | Interval |
|-------------------------|------------------------------------|----------|----------|
| Health Check (Primary)  | `https://your-domain.com/api/health` | Keyword  | 5 min    |
| Homepage Availability   | `https://your-domain.com`          | HTTP(s)  | 5 min    |
| API Availability        | `https://your-domain.com/api/products` | HTTP(s) | 10 min   |

---

## Expected Response Format

### Healthy Response (`200 OK`)

```json
{
  "status": "healthy",
  "timestamp": "2026-06-02T20:00:00.000Z",
  "services": {
    "mongodb": {
      "status": "connected",
      "latencyMs": 12
    },
    "redis": {
      "status": "connected",
      "latencyMs": 3
    },
    "cloudinary": {
      "status": "connected",
      "latencyMs": 245
    },
    "queues": {
      "status": "connected",
      "latencyMs": 8,
      "counts": {
        "active": 0,
        "waiting": 2,
        "completed": 150,
        "failed": 0
      }
    }
  },
  "uptime": 86400,
  "memoryUsage": {
    "rss": 95,
    "heapUsed": 62
  }
}
```

### Unhealthy Response (`503 Service Unavailable`)

```json
{
  "status": "unhealthy",
  "timestamp": "2026-06-02T20:00:00.000Z",
  "services": {
    "mongodb": {
      "status": "disconnected",
      "error": "readyState is 0"
    },
    "redis": {
      "status": "connected",
      "latencyMs": 3
    },
    "cloudinary": {
      "status": "connected",
      "latencyMs": 200
    },
    "queues": {
      "status": "connected",
      "latencyMs": 5,
      "counts": {
        "active": 0,
        "waiting": 0,
        "completed": 100,
        "failed": 2
      }
    }
  },
  "uptime": 86400,
  "memoryUsage": {
    "rss": 95,
    "heapUsed": 62
  }
}
```

### Response Fields Reference

| Field                     | Type    | Description                                       |
|---------------------------|---------|---------------------------------------------------|
| `status`                  | string  | `"healthy"` or `"unhealthy"` — overall system status |
| `timestamp`               | string  | ISO 8601 timestamp of the check                   |
| `services.<name>.status`  | string  | `"connected"` or `"disconnected"`                 |
| `services.<name>.latencyMs` | number | Round-trip latency in milliseconds               |
| `services.<name>.error`   | string  | Error message (only present when disconnected)    |
| `uptime`                  | number  | Server process uptime in seconds                  |
| `memoryUsage.rss`         | number  | Resident Set Size in MB                           |
| `memoryUsage.heapUsed`    | number  | V8 heap usage in MB                               |

---

## Alert Configuration

### Email Alerts (UptimeRobot)

1. Navigate to **My Settings → Alert Contacts** in UptimeRobot.
2. **Add Alert Contact:**
   - **Type:** Email
   - **Email Address:** Your operations team email (e.g., `ops@rerendetfarm.com`)
   - **Friendly Name:** `Ops Team`
3. Assign this contact to your health check monitor.

### Webhook Alerts (Slack, Discord, etc.)

1. In UptimeRobot, **Add Alert Contact:**
   - **Type:** Webhook
   - **URL:** Your Slack incoming webhook URL or Discord webhook URL
   - **POST Value (for Slack):**
     ```json
     {
       "text": "🚨 *monitorFriendlyName* is *alertTypeFriendlyName*\nURL: *monitorURL*\nDetails: *alertDetails*"
     }
     ```
2. Assign this webhook contact to your monitors.

### Built-in Admin Alerts

The platform includes an **internal alert system** that automatically:

- Creates `AdminAlert` records (type: `critical`, category: `dlq_item`) when any service fails a health check.
- Emails all active admin/super-admin users with a critical alert notification via BullMQ.
- These alerts are visible on the admin dashboard under **Alerts / Notifications**.

No external configuration is required for internal alerts — they are triggered automatically by the worker-side health monitoring loop.

---

## Dashboard Integration

### Admin System Health Endpoint

```
GET /api/admin/system-health
```

**Authentication:** Requires admin JWT token.

This endpoint returns comprehensive system health data including:

- **Cache stats:** Redis key counts, catalog cache size, settings cache status
- **Queue stats:** Job counts (active, waiting, completed, failed) per BullMQ queue
- **Security audits:** Recent login, webhook block, and signature error events
- **Resource usage:** Process uptime, memory (RSS/heap), Node.js version
- **Uptime stats** (`uptimeStats`):
  - `totalChecks` — Total health checks in the last 24 hours
  - `healthyChecks` — Number of healthy checks
  - `uptimePercent` — Uptime percentage (e.g., `99.58`)
  - `last24hAvgLatency` — Average latency per service `{ mongodb, redis, queues }`
  - `recentLogs` — Last 20 `SystemHealthLog` documents for timeline chart rendering

### Using the Data for Charts

The `recentLogs` array can be mapped directly to a timeline chart (e.g., Chart.js, Recharts) to visualize:

- **Status timeline:** Green/red dots per check
- **Latency trend lines:** Per-service latency over time
- **Memory/CPU usage trends**

### Example: Fetching uptime stats from the frontend

```javascript
const response = await fetch('/api/admin/system-health', {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await response.json();

console.log(`Uptime: ${data.uptimeStats.uptimePercent}%`);
console.log(`Avg MongoDB latency: ${data.uptimeStats.last24hAvgLatency.mongodb}ms`);
console.log(`Recent checks:`, data.uptimeStats.recentLogs.length);
```

---

## Internal Health Monitoring Loop

The always-on worker process (`workers/index.js`) runs a health monitoring loop every **2 minutes** using `setInterval`. This loop:

1. Checks **MongoDB** connectivity (readyState + ping)
2. Checks **Redis** connectivity (ping)
3. Checks **BullMQ** queue health (getJobCounts)
4. Records latency for each service
5. Saves a `SystemHealthLog` document to MongoDB
6. Creates a **critical `AdminAlert`** for any unhealthy service (triggers admin email notifications)

### Data Retention

`SystemHealthLog` documents accumulate over time. Consider implementing a TTL index or a periodic cleanup cron if storage becomes a concern:

```javascript
// Optional: Add a TTL index to auto-expire logs after 30 days
systemHealthLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
```

---

## Troubleshooting

| Symptom | Possible Cause | Resolution |
|---------|---------------|------------|
| Health endpoint returns 503 | One or more services are down | Check MongoDB Atlas status, Redis provider dashboard, Cloudinary status page |
| No health logs in database | Worker process is not running | Verify the always-on dyno is active; check `workers/index.js` logs |
| Alerts not being sent | BullMQ email queue is unhealthy | Check Redis connectivity; inspect failed jobs in the email queue |
| UptimeRobot shows "Keyword Not Found" | Response format changed | Verify the keyword matches the current JSON output structure |
