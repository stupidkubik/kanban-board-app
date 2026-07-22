import "server-only";

import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const getAdminCredential = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!serviceAccountJson) {
    return applicationDefault();
  }

  try {
    return cert(JSON.parse(serviceAccountJson) as ServiceAccount);
  } catch (error) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must contain valid JSON.", {
      cause: error,
    });
  }
};

const initAdminApp = () => {
  if (getApps().length) {
    return getApps()[0];
  }

  return initializeApp({ credential: getAdminCredential() });
};

const adminApp = initAdminApp();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminAuth, adminDb };
