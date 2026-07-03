import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, increment, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDjIHauC-JaGgCblxWLNxF567DsozGp-aw",
  authDomain: "course-guide-iitj.firebaseapp.com",
  projectId: "course-guide-iitj",
  storageBucket: "course-guide-iitj.firebasestorage.app",
  messagingSenderId: "90252497661",
  appId: "1:90252497661:web:4ed7b4ecafebcfa4d5a494",
  measurementId: "G-J5SBSVJBXL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Make these available to your other scripts
window.db = db;
window.fbHelpers = { doc, getDoc, setDoc, increment, serverTimestamp };
