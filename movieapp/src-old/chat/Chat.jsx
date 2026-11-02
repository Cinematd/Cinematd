import React, { useContext, useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../FirebaseConfig";
import { AuthContext } from "../context/AuthContext";
import Messages from "./Messages";
import Input from "./Input";

/**
 * Chat component:
 * We set up a listener to the userChats collection in the database.
 * When the userChats collection is updated, the listener will update the state of the chats variable, then this
 * component will re-render.
 */

const Chat = () => {
    // Pair programming: Pride & Amer.
    const [chats, setChats] = useState({});
    const [username, setUsername] = useState('');

    const { authUser } = useContext(AuthContext);

    // Get chats JSON data and set username
    if (chats !== undefined && chats.chatID === undefined && authUser !== null) {
        const getChats = () => {
            const unsub = onSnapshot(doc(db, "userChats", authUser.uid), (doc) => {
                setUsername(doc.data().username);
                setChats(doc.data());
            });

            return () => {
                unsub();
            };
        };
        getChats();
    }

    return (
        <div className="chat">
            <div className="chatInfo">
                <span>{username}</span>
            </div>
            <Messages/>
            <Input />
        </div>
    )
}
export default Chat