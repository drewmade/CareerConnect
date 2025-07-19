import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const FirebaseContext = createContext(null);

export const FirebaseProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null); // Firestore instance
    const [auth, setAuth] = useState(null); // Firebase Auth instance
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        console.log("[FirebaseContext] Initializing Firebase...");
        try {
            // --- REPLACE THIS LINE WITH YOUR ACTUAL FIREBASE CONFIG ---
            const firebaseConfig = {
                apiKey: "AIzaSyBEZ6OUUCN6ysNsoKrqUt6oKHwUbd3REN0",
                authDomain: "careerconnect-be1c2.firebaseapp.com",
                projectId: "careerconnect-be1c2",
                storageBucket: "careerconnect-be1c2.firebasestorage.app",
                messagingSenderId: "438458324180",
                appId: "1:438458324180:web:0790e13a0aad611888d741"
              // measurementId: "YOUR_MEASUREMENT_ID" // Optional
            };
            // --- END OF REPLACEMENT ---

            console.log("[FirebaseContext] Firebase Config:", firebaseConfig);

            const initializedApp = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(initializedApp);
            const firebaseAuth = getAuth(initializedApp);

            setApp(initializedApp);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                console.log("[FirebaseContext] onAuthStateChanged triggered. User:", user);
                if (user) {
                    setUserId(user.uid);
                    console.log("[FirebaseContext] User authenticated, UID:", user.uid);
                } else {
                    console.log("[FirebaseContext] No user found, attempting anonymous sign-in...");
                    try {
                        // __initial_auth_token is for Canvas environment, not local.
                        // We'll proceed with anonymous sign-in directly for local dev.
                        console.log("[FirebaseContext] Signing in anonymously...");
                        await signInAnonymously(firebaseAuth);
                        // After successful sign-in (anonymous), onAuthStateChanged will trigger again
                        // with the user object, so userId will be set then.
                    } catch (error) {
                        console.error("[FirebaseContext] Firebase authentication failed during sign-in attempt:", error);
                        setIsAuthReady(true);
                    }
                }
                if (!isAuthReady) {
                    setIsAuthReady(true);
                    console.log("[FirebaseContext] isAuthReady set to TRUE.");
                }
            });

            return () => {
                console.log("[FirebaseContext] Cleaning up auth state listener.");
                unsubscribe();
            };
        } catch (error) {
            console.error("[FirebaseContext] Failed to initialize Firebase (catch block):", error);
            setIsAuthReady(true);
        }
    }, []);

    return (
        <FirebaseContext.Provider value={{ app, db, auth, userId, isAuthReady }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    return useContext(FirebaseContext);
};
