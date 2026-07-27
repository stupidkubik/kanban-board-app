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

const getEmulatorProjectId = () =>
  process.env.GCLOUD_PROJECT ??
  process.env.FIREBASE_PROJECT_ID ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const isEmulatorMode = () =>
  Boolean(
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.FIRESTORE_EMULATOR_HOST
  );

const initAdminApp = () => {
  if (getApps().length) {
    return getApps()[0];
  }

  if (isEmulatorMode()) {
    const projectId = getEmulatorProjectId();
    if (!projectId) {
      throw new Error("Firebase emulator mode requires a project id.");
    }
    return initializeApp({ projectId });
  }

  return initializeApp({ credential: getAdminCredential() });
};

const adminApp = initAdminApp();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminAuth, adminDb };
