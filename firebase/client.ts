import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVQsKwohzEICqVXZ-4OcvYdPWgmqj_ybM",
  authDomain: "klm-projectmanagement.firebaseapp.com",
  projectId: "klm-projectmanagement",
  storageBucket: "klm-projectmanagement.firebasestorage.app",
  messagingSenderId: "149050797593",
  appId: "1:149050797593:web:f88289cb162f30ce6e0488",
  measurementId: "G-4ZCJE7PKBQ"
};

let app;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
