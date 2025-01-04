import './authdetails.css';
import { auth, app } from "../FirebaseConfig";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';

/**
 * AuthDetails provides the sign out functionality for the app.
 */

const AuthDetails = () => {
  const [authUser, setAuthUser] = useState(null);
  const [json, setJSON] = useState({});
  const [username, setUsername] = useState("");

  useEffect(() => {
    // Amer
    const getJSON = async () => {
        const ref = collection(getFirestore(app), 'authentications');
    
        // await setDoc(doc(getFirestore(app), "members", "member"), json);
    
        const querySnapshot = await getDocs(collection(getFirestore(app), "authentications"));
        querySnapshot.forEach((doc) => {
            if (doc.data().test === undefined) {
                setJSON(doc.data());
            }
        });
    }
    getJSON();
  }, {});

  useEffect(() => {
    const listen = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
      }
    });

    return () => {
      listen();
    };
  }, []);

  if (json !== undefined && authUser !== undefined) {
    if (authUser !== null) {
      if (json[authUser.email] !== undefined) {
        if (username === "") {
          setUsername(json[authUser.email].username);
        }
      }
    }
  }

  let navigate = useNavigate(); 
  const redirect = (p) => { 
      let path = p; 
      navigate(path);
  }

  const userSignOut = () => {
    signOut(auth)
      .then(() => {
        redirect('/home');
        console.log("sign out successful");
      })
      .catch((error) => console.log(error));
  };

  return (
    <div className="signout-container">
      {authUser ? (
        <>
          <h2>Are you sure you want to sign out?</h2>
          <button className='signoutpage-button'onClick={userSignOut}>Sign Out</button>
        </>
      ) : (
        <p>Signed Out</p>
      )}
    </div>
  );
};

export default AuthDetails;