const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const env = require('./env');

let db = null;
let storage = null;
let messaging = null;

function initFirebase() {
  if (admin.apps.length) {
    return { db: admin.firestore(), storage: admin.storage(), messaging: admin.messaging() };
  }

  const accountPath = env.firebaseServiceAccountPath
    ? path.resolve(process.cwd(), env.firebaseServiceAccountPath)
    : null;

  if (accountPath && fs.existsSync(accountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: env.firebaseStorageBucket,
    });
  } else {
    console.warn('Firebase service account not found — Firestore/FCM will use stubs in dev mode');
    admin.initializeApp({ projectId: 'recycle-me-dev' });
  }

  db = admin.firestore();
  storage = admin.storage();
  messaging = admin.messaging();

  return { db, storage, messaging, admin };
}

function getFirestore() {
  if (!db) initFirebase();
  return db;
}

function getStorage() {
  if (!storage) initFirebase();
  return storage;
}

function getMessaging() {
  if (!messaging) initFirebase();
  return messaging;
}

module.exports = { initFirebase, getFirestore, getStorage, getMessaging, admin };
