# Hybrid Online/Offline AI Integration Plan

This plan outlines the integration of an n8n webhook for online medical queries, with a seamless fallback to the local Gemma model when the device is offline.

## User Review Required

> [!IMPORTANT]
> **Network Permissions**: We already added `INTERNET` and `ACCESS_NETWORK_STATE` in the previous step, so no further manifest changes are needed.
> **Request Format**: I will assume the n8n webhook expects a JSON POST body like `{"query": "User question here"}`. Please confirm if your n8n workflow uses a different parameter name.

## Proposed Changes

### AI & Networking Layer

#### [NEW] [OnlineAiClient.kt](file:///D:/OneDrive - galgotiasuniversity.edu.in/Desktop/offline health help/app/src/main/java/com/offlinehealth/firstaid/ai/OnlineAiClient.kt)
Create a lightweight networking client using `HttpURLConnection` (to avoid adding new dependencies) and `org.json` (built into Android) to communicate with the n8n webhook.

#### [MODIFY] [ChatRepository.kt](file:///D:/OneDrive - galgotiasuniversity.edu.in/Desktop/offline health help/app/src/main/java/com/offlinehealth/firstaid/data/repository/ChatRepository.kt)
Update the logic to:
1.  Check for active internet connectivity using `ConnectivityManager`.
2.  If online, attempt to fetch the answer from the n8n webhook.
3.  If the device is offline or the webhook request fails, automatically fall back to the `gemmaEngine`.
4.  Maintain the **Deterministic Emergency Triage** as the top priority (always local and instant).

#### [MODIFY] [OfflineHealthApp.kt](file:///D:/OneDrive - galgotiasuniversity.edu.in/Desktop/offline health help/app/src/main/java/com/offlinehealth/firstaid/OfflineHealthApp.kt)
Initialize the new `OnlineAiClient` and inject it into the `ChatRepository`.

## Verification Plan

### Automated Tests
- I will verify the JSON parsing logic for the `[{"text": "..."}]` format.

### Manual Verification
1.  **Online Test**: Run the app with Wi-Fi/Data enabled, ask a general question (e.g., "What is paracetamol?"), and verify the answer comes from the n8n webhook (which typically has more detailed formatting).
2.  **Offline Test**: Turn on Airplane Mode, ask the same question, and verify the app correctly falls back to the local Gemma engine (showing the "Offline Engine" indicator).
3.  **Emergency Test**: Ask "Help, someone is choking!" while online to ensure the local emergency protocol still takes precedence over the network call.
