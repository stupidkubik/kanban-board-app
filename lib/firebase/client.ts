import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { ReCaptchaV3Provider, initializeAppCheck } from "firebase/app-check";
import type { AppCheck } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { firebaseConfig, hasFirebaseConfig } from "@/lib/firebase/config";

if (!hasFirebaseConfig()) {
  throw new Error(
    "Missing Firebase client environment variables. Set NEXT_PUBLIC_FIREBASE_* in .env.local."
  );
}

const clientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

const appCheckSiteKey =
  process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY ??
  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const appCheckDebugToken = process.env.NEXT_PUBLIC_FIREBASE_APP_CHECK_DEBUG;
const appCheckGlobal = globalThis as typeof globalThis & {
  __KANBAN_FIREBASE_APP_CHECK__?: AppCheck;
};
let clientAppCheck = appCheckGlobal.__KANBAN_FIREBASE_APP_CHECK__ ?? null;
const isBrowser = typeof window !== "undefined";

if (appCheckSiteKey && isBrowser && !clientAppCheck) {
  const isLocalhost = window.location.hostname === "localhost";

  if (process.env.NODE_ENV !== "production" && (appCheckDebugToken || isLocalhost)) {
    const debugValue = appCheckDebugToken
      ? appCheckDebugToken === "true"
        ? true
        : appCheckDebugToken
      : true;
    (globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = debugValue;
  }

  clientAppCheck = initializeAppCheck(clientApp, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckGlobal.__KANBAN_FIREBASE_APP_CHECK__ = clientAppCheck;
}
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

export { clientApp, clientAppCheck, clientAuth, clientDb };
