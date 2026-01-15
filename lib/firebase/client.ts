import "client-only";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import { firebaseConfig, hasFirebaseConfig } from "@/lib/firebase/config";

if (!hasFirebaseConfig()) {
  throw new Error(
    "Missing Firebase client environment variables. Set NEXT_PUBLIC_FIREBASE_* in .env.local."
  );
}

const clientApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

export { clientApp, clientAuth, clientDb };
