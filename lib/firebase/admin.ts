import "server-only";

import fs from "node:fs";
import path from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const DEFAULT_SERVICE_ACCOUNT_PATH = path.join(
  process.cwd(),
  "kanban-mvp-1baf2-firebase-adminsdk-fbsvc-ae0f47a077.json"
);

const loadServiceAccount = (): ServiceAccount | null => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount;
  }

  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || DEFAULT_SERVICE_ACCOUNT_PATH;

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as ServiceAccount;
};

const initAdminApp = () => {
  if (getApps().length) {
    return getApps()[0];
  }

  const serviceAccount = loadServiceAccount();

  if (serviceAccount) {
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp({ credential: applicationDefault() });
};

const adminApp = initAdminApp();
const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);

export { adminApp, adminAuth, adminDb };
