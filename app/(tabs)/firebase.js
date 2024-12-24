import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAIai4JyY2AemPvQlVvDuLrKdjZe5y8YCo",
  authDomain: "call-aa8bc.firebaseapp.com",
  projectId: "call-aa8bc",
  storageBucket: "call-aa8bc.firebasestorage.app",
  messagingSenderId: "823637946813",
  appId: "1:823637946813:web:5693abf120c45ef17b62d4"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// Get Firestore instance
export const firestore = getFirestore(firebaseApp);
