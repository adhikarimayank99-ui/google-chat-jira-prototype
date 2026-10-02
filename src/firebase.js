import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBjsZwS3aaXjC66Tyzu15Bq_GpDafygsds",
  authDomain: "projectmanagementchat-f8b69.firebaseapp.com",
  projectId: "projectmanagementchat-f8b69",
  storageBucket: "projectmanagementchat-f8b69.firebasestorage.app",
  messagingSenderId: "900898127168",
  appId: "1:900898127168:web:02ebd538063277d0174ea5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);