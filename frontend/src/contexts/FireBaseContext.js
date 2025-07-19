import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const FirebaseContext = createContext(null);

export const FirebaseProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Function to show a simple message box (can be replaced by a global one if available)
    const showLocalMessageBox = (msg, type = 'success') => {
        console.log(`[FirebaseContext Message] ${type.toUpperCase()}: ${msg}`);
        // In a real app, you'd dispatch this to a global message state
        // For now, it's just a console log
    };

    useEffect(() => {
        try {
            const firebaseConfig = {
                apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
                authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
                storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.REACT_APP_FIREBASE_APP_ID,
                measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID // Optional
            };

            if (!firebaseConfig.projectId) {
                console.error("Firebase Initialization Error: projectId not provided in environment variables.");
                showLocalMessageBox("Firebase setup incomplete. Contact support.", "error");
                setIsAuthReady(true);
                return;
            }

            let initializedApp;
            if (!getApps().length) {
                initializedApp = initializeApp(firebaseConfig);
            } else {
                initializedApp = getApp();
                console.warn("Firebase app already initialized in FirebaseContext. Using existing app.");
            }

            const firestoreDb = getFirestore(initializedApp);
            const firebaseAuth = getAuth(initializedApp);

            setApp(initializedApp);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        // Attempt anonymous sign-in for Render deployment
                        await signInAnonymously(firebaseAuth);
                    } catch (error) {
                        console.error("Firebase anonymous authentication failed:", error);
                        showLocalMessageBox("Anonymous login failed. Some features may not work.", "error");
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe();
        } catch (error) {
            console.error("Failed to initialize Firebase in FirebaseContext catch block:", error);
            showLocalMessageBox("Failed to initialize Firebase. Check console for details.", "error");
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