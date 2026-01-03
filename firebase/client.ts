
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBVQsKwohzEICqVXZ-4OcvYdPWgmqj_ybM",
  authDomain: "klm-projectmanagement.firebaseapp.com",
  projectId: "klm-projectmanagement",
  storageBucket: "klm-projectmanagement.firebasestorage.app",
  messagingSenderId: "149050797593",
  appId: "1:149050797593:web:f88289cb162f30ce6e0488",
  measurementId: "G-4ZCJE7PKBQ"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);