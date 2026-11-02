import './chatpage.scss'

import Sidebar from '../chat/Sidebar'
import Chat from '../chat/Chat'

import React, { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

/**
 * ChatPage component:
 * This component displays the chat page. It renders the Sidebar and Chat components.
 * Chat needs an account, so visitors who aren't logged in are sent to the log-in page
 * (which links to sign-up) and brought back here afterwards.
 */

const ChatPage = () => {
    // Pair programming: Pride & Amer.
    const { authUser, authReady } = useContext(AuthContext);

    // Wait for Firebase to report whether someone is logged in.
    if (!authReady) {
        return <div className='chatpage' aria-busy="true"></div>;
    }

    if (authUser === null) {
        return <Navigate to="/signin" replace state={{ from: '/chat' }} />;
    }

    return (
        <div className='chatpage'>
            <div className="chat-container">
                <Sidebar/>
                <Chat/>
            </div>
        </div>
    )
}

export default ChatPage
