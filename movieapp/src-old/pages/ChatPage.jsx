import './chatpage.scss'

import Sidebar from '../chat/Sidebar'
import Chat from '../chat/Chat'

import React from 'react'

/**
 * ChatPage component:
 * This component displays the chat page. It is the UI for the chat page. It renders the Sidebar and Chat components.
 */

const ChatPage = () => {
    // Pair programming: Pride & Amer.
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