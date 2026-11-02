import React from "react";
import ChatNavbar from "./ChatNavbar";
import Search from "./Search";
import Chats from "./Chats";

/**
 * Sidebar component:
 * This component displays the sidebar for the chat page. It renders the ChatNavbar, Search, and Chats.
 */

const Sidebar = () => {
    return (
        <div className="sidebar">
            <ChatNavbar/>
            <Search/>
            <Chats/>
        </div>
    )
}
export default Sidebar