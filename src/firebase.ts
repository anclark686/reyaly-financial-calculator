// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAk7EbMy9qAEU51jX_HguA-pwiuoWCTyH4",
  authDomain: "reyaly-financial-calculator.firebaseapp.com",
  projectId: "reyaly-financial-calculator",
  storageBucket: "reyaly-financial-calculator.firebasestorage.app",
  messagingSenderId: "936897479980",
  appId: "1:936897479980:web:51449ee781f334f6be9889",
  measurementId: "G-BD03SEY9J7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);

// Enable auth persistence
import { setPersistence, browserLocalPersistence } from "firebase/auth";
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});
