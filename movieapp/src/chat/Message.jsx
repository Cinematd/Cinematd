import React, { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Message component:
 * This component handles the rendering of the messages in the chat window. It displays the avatar, time, and message
 * of the user that sent the message. It also handles the scrolling of the chat window, so that the most recent
 * message is always displayed.
 */

const Message = ({ message }) => {
    // Pair programming: Pride & Amer.
    const { authUser } = useContext(AuthContext);

    const ref = useRef();

    useEffect(() => {
        ref.current?.scrollIntoView({ behavior: "smooth" });
    }, [message]);

    return (
        <div
            ref={ref}
            className={`message ${message.senderId === (authUser === null ? "" : authUser.uid) ? "owner" : ""}`}
            >
            <div className="messageInfo">
                <img
                src={message.avatar}
                alt=""
                />
                <span>{message.time}</span>
            </div>
            <div className="messageContent">
                <p>{message.message}</p>
            </div>
        </div>
    );
};

export default Message;