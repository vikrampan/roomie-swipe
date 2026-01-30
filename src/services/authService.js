import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from '../firebase';

export const loginUser = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw new Error("Login failed");
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error", error);
  }
};