import { onAuthStateChanged } from "firebase/auth";
import { createContext, useEffect, useState } from "react";
import { auth } from '../FirebaseConfig'
import { app } from '../FirebaseConfig';

import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

export const AuthContext = createContext()

/**
 * AuthContext is a React Context that provides the current authenticated user.
 */

export const AuthContextProvider = ({children}) => {
    // Amer
    const [authJson, setAuthJSON] = useState({});
    const [authUser, setAuthUser] = useState(null);
    // False until Firebase reports the sign-in state for the first time, so
    // pages can tell "still checking" apart from "signed out".
    const [authReady, setAuthReady] = useState(false);
    const [json, setJSON] = useState({});

    useEffect(() => {
        const getJSON = async () => {
            const ref = collection(getFirestore(app), 'members');
        
            // await setDoc(doc(getFirestore(app), "members", "member"), json);
        
            const querySnapshot = await getDocs(collection(getFirestore(app), "members"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setJSON(doc.data());
                }
            });
        }
        getJSON();
    }, []);

    useEffect(() => {
        const getAuthJSON = async () => {
            const ref = collection(getFirestore(app), 'authentications');
        
            // await setDoc(doc(getFirestore(app), "members", "member"), json);
        
            const querySnapshot = await getDocs(collection(getFirestore(app), "authentications"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setAuthJSON(doc.data());
                }
            });
        }
        getAuthJSON();
    }, []);

    useEffect(() => {
        const listen = onAuthStateChanged(auth, (user) => {
          if (user) {
            setAuthUser(user);
          } else {
            setAuthUser(null);
          }
          setAuthReady(true);
        });
    
        return () => {
          listen();
        };
    }, []);

    return (
    <AuthContext.Provider value={{authUser, authReady}}>
        {children}
    </AuthContext.Provider>

    );
}