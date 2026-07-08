import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signOut,
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Email & Password Auth Helpers

/**
 * Creates a new Firebase Auth user with email/password, sets the displayName,
 * and automatically creates the user document at /users/${uid} in Firestore.
 */
export const emailSignUp = async (
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User }> => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update the authentication profile displayName
    await updateProfile(user, { displayName });

    // Refresh user object reference to guarantee updated details
    const updatedUser = auth.currentUser || user;

    // Direct Firestore write to /users/${uid} with all required fields (checking existence first)
    const userDocRef = doc(db, "users", updatedUser.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      await setDoc(userDocRef, {
        uid: updatedUser.uid,
        displayName: displayName || "",
        email: updatedUser.email ?? "",
        photoURL: "",
        plan: "free",
        freeRepliesRemaining: 20,
        totalRepliesGenerated: 0,
        subscriptionStatus: "free",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp()
      });
    }

    return { user: updatedUser };
  } catch (error: any) {
    console.error("Sign up error in firebaseAuth:", error);
    throw error;
  }
};

/**
 * Signs in an existing Firebase Auth user and updates only the lastLogin field in Firestore.
 */
export const emailSignIn = async (
  email: string,
  password: string
): Promise<{ user: User }> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update only lastLogin field in Firestore safely (checking existence first)
    const userDocRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: user.displayName || "User",
        email: user.email ?? "",
        photoURL: "",
        plan: "free",
        freeRepliesRemaining: 20,
        totalRepliesGenerated: 0,
        subscriptionStatus: "free",
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });
    } else {
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp()
      });
    }

    return { user };
  } catch (error: any) {
    console.error("Sign in error in firebaseAuth:", error);
    throw error;
  }
};

/**
 * Signs out the authenticated Firebase User.
 */
export const emailLogout = async () => {
  await signOut(auth);
};

// App initialization and session listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, user.uid);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};
