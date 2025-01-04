
import React from "react";
import { AuthContext } from "../context/AuthContext";
import { useContext, useState, useEffect } from "react";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
import { auth, app } from '../FirebaseConfig';

/**
 * ChatNavbar component:
 * This component displays the navbar for the chat page.
 * Including the display of the name of the user that is logged in.  This is done
 * by accessing the authUser variable from the AuthContext, grabbing data from authentications,
 * and displaying this data.
 */

const ChatNavbar = () => {
    // Pair programming: Pride & Amer.
    const {authUser} = useContext(AuthContext)
    const [authJson, setAuthJSON] = useState({});
    const [display, setDisplay] = useState('');

    // Get authentications JSON
    useEffect(() => {
        const getAuthJSON = async () => {
            // await setDoc(doc(getFirestore(app), "members", "member"), json);
        
            const querySnapshot = await getDocs(collection(getFirestore(app), "authentications"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setAuthJSON(doc.data());
                }
            });
        }
        getAuthJSON();
    }, {});

    // Set display
    if (authUser !== null && authJson !== null) {
        if (authJson[authUser.email] !== undefined) {
            if (display === '') {
                setDisplay(authJson[authUser.email].username);
            }
        }
    }

    return (
        <div className="chat-navbar">
            <span className="chat-title">Chat</span>
            <div className="user">
                <span>{display}</span>
            </div>
        </div>
    )
}
export default ChatNavbar