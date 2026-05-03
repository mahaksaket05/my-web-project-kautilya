import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
// CRITICAL: The app will break without the databaseId being passed to getFirestore if it's not '(default)'
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
