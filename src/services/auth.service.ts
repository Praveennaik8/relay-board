import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { auth, googleProvider } from "@/firebase/config";

export function observeAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  await signOut(auth);
}
