# Firebase Firestore Setup Guide

## 1. Get Your Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Click the ⚙️ (Settings) icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Click **"Generate Key"** - this downloads a JSON file
7. **SAVE THIS FILE** as:
   ```
   c:\Users\sumit\OneDrive\Documents\LabReportTracker\backend\service-account.json
   ```

## 2. Enable Firestore

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set custom rules)
4. Select your region (closest to you)
5. Click **Enable**

## 3. Set Firestore Rules

In **Firestore Database** → **Rules**, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId || 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /documents/{docId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /appointments/{appointmentId} {
      allow read, write: if request.auth != null;
    }
    
    match /doctorPatientLinks/{linkId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Click **Publish**

## 4. After Setup

Once `service-account.json` is in place, restart the backend server.
You should see: "🔥 Firebase Admin Initialized Successfully"
