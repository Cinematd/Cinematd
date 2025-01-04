import React, { useContext, useState, useEffect } from "react";
import { db, app } from "../FirebaseConfig";
import { AuthContext } from "../context/AuthContext";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { getFirestore, collection, getDocs, setDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";

/**
 * Chats component:
 * This component handles all the chatting rendering of the app. It displays the sidebar of the chats, and the chat
 * window itself.  It also handles the updating of the chats.
 * All of this is done by accessing the authUser variable from the AuthContext and using it to grab data from 
 * authentications and members stored in Firestore. These collections contain all the data needed to display whatever
 * needs to be shown.
 */

const Chats = () => {
    // Pair programming: Pride & Amer.
    const [chats, setChats] = useState([]);
    const [json, setJSON] = useState({});
    const [authJSON, setAuthJSON] = useState({});
    const [displayFriends, setDisplayFriends] = useState([]);
    const [started, setStarted] = useState(false);

    const { authUser } = useContext(AuthContext);

    // Listener
    if (chats !== undefined && chats.length === 0 && authUser !== null) {
        const getChats = () => {
            const unsub = onSnapshot(doc(db, "userChats", authUser.uid), (doc) => {
                setChats(doc.data());
            });

            return () => {
                unsub();
            };
        };
        getChats();
    }

    // Get members JSON
    useEffect(() => {
        const getJSON = async () => {
            // await setDoc(doc(getFirestore(app), "members", "member"), json);
        
            const querySnapshot = await getDocs(collection(getFirestore(app), "members"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setJSON(doc.data());
                }
            });
        }
        getJSON();
    }, {});

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

    // Setting all user information
    if (authUser !== null && authJSON !== null && json !== null && !started) {
        if (authJSON[authUser.email] !== undefined) {
            if (json[authJSON[authUser.email].username] !== undefined) {
                const chatFriends = [];
                const friends = json[authJSON[authUser.email].username].friends;

                for (let i = 0; i < friends.length; i++) {
                    if (friends[i] !== undefined) {
                        if (friends[i] !== '') {
                            
                            const addToChatSidebar = async () => {
                                for (let j = 0; j < authJSON.usernames.length; j++) {
                                    if (authJSON.usernames[j].username === friends[i]) {
                                        const storage = getStorage();
                                        const avatarRef = ref(storage, `avatars/${authJSON.usernames[j].uid}`);

                                        await getDownloadURL(avatarRef)
                                            .then((url) => {
                                                chatFriends.push(
                                                    <div className="userChat" onClick={() => {
                                                        const update = async () => {
                                                            let chatID = '';
                                                            if (authUser.uid < doc.id) {
                                                                chatID = authUser.uid + authJSON.usernames[j].uid;
                                                            } else {
                                                                chatID = authJSON.usernames[j].uid + authUser.uid;
                                                            }
                                                            const random = Math.floor(Math.random() * 1000);
                                                            await updateDoc(doc(db, "userChats", authUser.uid), {
                                                                other: [random],
                                                                username: friends[i],
                                                                chatID: chatID,
                                                            });
                                                        }
                                                        update();
                                                    }}>
                                                        <img src={url}
                                                        alt="" 
                                                        />
                                                        <div className="userChatInfo">
                                                            <span>{friends[i]}</span>
                                                        </div>
                                                    </div>);
                                            }).catch((err)=> {
                                                console.log(err)
                                            });
                                    }
                                }
                            }
                            const update = async () => {
                                await addToChatSidebar();
                                setDisplayFriends(chatFriends);
                                setStarted(true);
                            }
                            update();
                        }
                    }
                }
            }
        }
    }

    return (
        <div className="chats">
            <ol>{displayFriends}</ol>
        </div>
    )
}
export default Chats