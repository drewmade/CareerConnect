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

    // A simple local message box for FirebaseContext internal errors/logs
    const showLocalMessageBox = (msg, type = 'success') => {
        console.log(`[FirebaseContext Message] ${type.toUpperCase()}: ${msg}`);
        // In a real app, you might want to integrate this with the global MessageBox in App.js
    };

    useEffect(() => {
        try {
            // Firebase configuration from environment variables
            const firebaseConfig = {
                apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
                authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
                storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.REACT_APP_FIREBASE_APP_ID,
                measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID // Optional
            };

            // Validate essential config
            if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
                console.error("Firebase Initialization Error: Missing projectId or apiKey in environment variables.");
                showLocalMessageBox("Firebase setup incomplete. Contact support.", "error");
                setIsAuthReady(true); // Mark auth ready to prevent infinite loading, but with error
                return;
            }

            let initializedApp;
            // Check if a Firebase app with the default name already exists
            if (!getApps().length) { // Only initialize if no apps are already initialized
                initializedApp = initializeApp(firebaseConfig);
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
                } else {
                    try {
                        // Attempt anonymous sign-in for Render deployment (no __initial_auth_token)
                        await signInAnonymously(firebaseAuth);
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
    }, []); // Empty dependency array ensures this runs only once

    return (
        <FirebaseContext.Provider value={{ app, db, auth, userId, isAuthReady }}>
            {children}
        </FirebaseContext.Provider>
    );
};

export const useFirebase = () => {
    return useContext(FirebaseContext);
};
