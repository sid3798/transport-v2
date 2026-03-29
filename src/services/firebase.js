import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByUnzYucIwEtaZYDtJ5oHAdVtE6gzJ4YM",
  authDomain: "transport-assistant-v2.firebaseapp.com",
  projectId: "transport-assistant-v2",
  storageBucket: "transport-assistant-v2.firebasestorage.app",
  messagingSenderId: "640734215526",
  appId: "1:640734215526:web:e72c67795f5ed9e3b35ca7",
  measurementId: "G-4Y3C1YYVHM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ THIS is what we need
export const db = getFirestore(app);