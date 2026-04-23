// firebase-config.js - Configuración central de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyARBxXevkkxnIcty8NMYT0t2hCG5B2MhOU",
    authDomain: "proyecto-contabilidad-25eb0.firebaseapp.com",
    projectId: "proyecto-contabilidad-25eb0",
    storageBucket: "proyecto-contabilidad-25eb0.firebasestorage.app",
    messagingSenderId: "584661271319",
    appId: "1:584661271319:web:7317b3441e8d370ba8ad52"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);