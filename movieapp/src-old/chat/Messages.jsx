import React, { useContext, useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../FirebaseConfig";
import { AuthContext } from "../context/AuthContext";
import Message from './Message'

/**
 * Messages component:
 * This component displays the messages for the chat page. It does this by accessing the chats variable from the
 * Chat component, and using it to get the messages from the messages collection in Firestore. Additionally, it contains
 * a listener that updates the messages when the messages collection is updated, which allows messages to be
 * updated in real-time. Then, it re-renders the messages.
 */

const Messages = () => {
    // Pair programming: Pride & Amer.
    const [chats, setChats] = useState({});
    const [messages, setMessages] = useState([]);
    const [started, setStarted] = useState(false);

    const { authUser } = useContext(AuthContext);

    if (chats !== undefined && chats.chatID === undefined && authUser !== null) {
        const getChats = () => {
            const unsub = onSnapshot(doc(db, "userChats", authUser.uid), (doc) => {
                setStarted(false);
                setChats(doc.data());
            });

            return () => {
                unsub();
            };
        };
        getChats();
    }

    if (chats !== undefined && chats.chatID !== undefined && !started) {
        try {
            const getMessages = () => {
                const unsub = onSnapshot(doc(db, "messages", chats.chatID), (doc) => {
                    setMessages(doc.data().messages);
                });
    
                return () => {
                    unsub();
                };
            };
            getMessages();
            setStarted(true);
        } catch (exc) { }
    }
    
    return (
        <div className="messages">
            {messages.map((message) => {
                return <Message message={message} key={message.time} />
            })}
        </div>
    )
}

export default Messages