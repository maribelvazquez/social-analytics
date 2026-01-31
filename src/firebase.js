import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAUI6vhKXXO7Hpxjxx72xH_iLsdh-1LNQo",
  authDomain: "social-tracker360.firebaseapp.com",
  projectId: "social-tracker360",
  storageBucket: "social-tracker360.firebasestorage.app",
  messagingSenderId: "182243011028",
  appId: "1:182243011028:web:a410604502b81dfa6b8e41"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============ MÉTRICAS DE REDES ============
export const getMetricas = async () => {
  const q = query(collection(db, "metricas_redes"), orderBy("fecha", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addMetrica = async (data) => {
  const docRef = doc(db, "metricas_redes", data.fecha);
  await setDoc(docRef, data);
  return { id: data.fecha, ...data };
};

export const updateMetrica = async (id, data) => {
  const docRef = doc(db, "metricas_redes", id);
  await updateDoc(docRef, data);
  return { id, ...data };
};

export const deleteMetrica = async (id) => {
  const docRef = doc(db, "metricas_redes", id);
  await deleteDoc(docRef);
};

// ============ LEADS ============
export const getLeads = async () => {
  const q = query(collection(db, "leads"), orderBy("fecha", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addLead = async (data) => {
  const docRef = await addDoc(collection(db, "leads"), data);
  return { id: docRef.id, ...data };
};

export const updateLead = async (id, data) => {
  const docRef = doc(db, "leads", id);
  await updateDoc(docRef, data);
  return { id, ...data };
};

export const deleteLead = async (id) => {
  const docRef = doc(db, "leads", id);
  await deleteDoc(docRef);
};

export { db };
