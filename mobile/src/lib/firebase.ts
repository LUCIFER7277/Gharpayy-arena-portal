import { initializeApp } from "firebase/app";
import { Alert, Platform } from "react-native";
import { api } from "./api-client";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if config is provided
const isConfigured = !!firebaseConfig.apiKey;

export const app = isConfigured ? initializeApp(firebaseConfig) : null;

// firebase/messaging uses document.documentElement internally — web only.
// On native (iOS/Android) we skip it entirely to avoid the crash.
const isWebPlatform = Platform.OS === "web";

let _messaging: ReturnType<typeof import("firebase/messaging")["getMessaging"]> | null = null;

if (isConfigured && isWebPlatform && typeof document !== "undefined") {
  // Dynamically import so Metro never bundles it on native
  import("firebase/messaging").then(({ getMessaging, onMessage }) => {
    _messaging = getMessaging(app!);
    onMessage(_messaging, (payload) => {
      console.log("[fcm] Message received in foreground:", payload);
      const title = payload.notification?.title || "New Notification";
      const body = payload.notification?.body || "You have a new message.";
      Alert.alert(title, body);
    });
  });
}

export const getMessagingInstance = () => _messaging;

export async function requestNotificationPermissionAndGetToken() {
  if (!isWebPlatform || !isConfigured || typeof document === "undefined") {
    console.warn("[fcm] Push notifications via FCM are web-only in this build.");
    return null;
  }

  const messaging = _messaging;
  if (!messaging) {
    console.warn("[fcm] Firebase messaging not initialized yet.");
    return null;
  }

  try {
    const { getToken } = await import("firebase/messaging");
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;

      if (registration.installing) {
        await new Promise<void>((resolve) => {
          registration.installing?.addEventListener('statechange', (e: any) => {
            if (e.target.state === 'activated') resolve();
          });
        });
      }

      const token = await getToken(messaging, {
        vapidKey: process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        console.log("[fcm] Token generated successfully (hidden for security).");
        await api.post("/fcm/register", { token });
        return token;
      } else {
        console.warn("[fcm] No registration token available.");
      }
    } else {
      console.warn("[fcm] Notification permission denied.");
    }
  } catch (err) {
    console.error("[fcm] An error occurred while retrieving token:", err);
  }
  return null;
}

