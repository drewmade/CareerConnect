import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const FirebaseContext = createContext(null);

export const FirebaseProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // A simple local message box for FirebaseContext internal errors/logs
    // This is just for console logging within the context itself.
    const showLocalMessageBox = (msg, type = 'success') => {
        console.log(`[FirebaseContext Message] ${type.toUpperCase()}: ${msg}`);
    };

    useEffect(() => {
        try {
            // Firebase configuration from environment variables
            // Using the exact config you provided, but accessed via process.env
            const firebaseConfig = {
                apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
                authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
                storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.REACT_APP_FIREBASE_APP_ID,
                // measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID // Optional, if you have it
            };

            // Validate essential config
            if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
                console.error("Firebase Initialization Error: Missing projectId or apiKey in environment variables.");
                showLocalMessageBox("Firebase setup incomplete. Please ensure all REACT_APP_FIREBASE_... environment variables are set.", "error");
                setIsAuthReady(true); // Mark auth ready to prevent infinite loading
                return;
            }

            let initializedApp;
            // Check if a Firebase app with the default name already exists
            // This prevents the "app/duplicate-app" error
            if (!getApps().length) {
                initializedApp = initializeApp(firebaseConfig);
                console.log("Firebase app initialized successfully.");
            } else {
                initializedApp = getApp(); // Get the already initialized app
                console.warn("Firebase app already initialized. Using existing app instance.");
            }

            const firestoreDb = getFirestore(initializedApp);
            const firebaseAuth = getAuth(initializedApp);

            setApp(initializedApp);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Listen for auth state changes
            const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    console.log("Firebase user authenticated:", user.uid);
                } else {
                    try {
                        // Attempt anonymous sign-in for Render deployment
                        const anonymousUser = await signInAnonymously(firebaseAuth);
                        setUserId(anonymousUser.user.uid);
                        console.log("Firebase signed in anonymously:", anonymousUser.user.uid);
                    } catch (error) {
                        console.error("Firebase anonymous authentication failed:", error);
                        showLocalMessageBox("Anonymous login failed. Some features may not work.", "error");
                    }
                }
                setIsAuthReady(true); // Auth state is ready after initial check/sign-in
            });

            return () => unsubscribe(); // Clean up the listener on component unmount
        } catch (error) {
            console.error("Failed to initialize Firebase in FirebaseContext catch block:", error);
            showLocalMessageBox("Failed to initialize Firebase. Check console for details.", "error");
            setIsAuthReady(true); // Ensure authReady is set even on error
        }
    }, []); // Empty dependency array ensures this runs only once on mount

    return (
        <FirebaseContext.Provider value={{ app, db, auth, userId, isAuthReady }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    return useContext(FirebaseContext);
};
