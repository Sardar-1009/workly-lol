import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBD7hSPKyWiBOeCH9EMAeXOKDPG4Eo5J28",
  authDomain: "workly-695e2.firebaseapp.com",
  projectId: "workly-695e2",
  storageBucket: "workly-695e2.firebasestorage.app",
  messagingSenderId: "492830743178",
  appId: "1:492830743178:web:06ccbe1d541b616d54eb73",
  measurementId: "G-B99YTMT19S"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
