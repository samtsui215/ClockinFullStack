// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBVQsKwohzEICqVXZ-4OcvYdPWgmqj_ybM",
  authDomain: "klm-projectmanagement.firebaseapp.com",
  projectId: "klm-projectmanagement",
  storageBucket: "klm-projectmanagement.appspot.com",
  messagingSenderId: "149050797593",
  appId: "1:149050797593:web:f88289cb162f30ce6e0488",
  measurementId: "G-4ZCJE7PKBQ"
};

// Initialize Firebase app once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
