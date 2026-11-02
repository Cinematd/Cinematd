import './signin.css';

import { auth, app } from "../FirebaseConfig";

import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';

/**
 * SignIn component:
 * This component handles the sign in page. It handles the sign in functionality.
 * It also handles the redirecting to the profile page after signing in.
 */

const SignIn = () => {
  // Pair programming: Pride & Amer.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [json, setJSON] = useState({});

  /*
  const CssTextField = styled(TextField)(({ theme }) => ({
    '& label.Mui-focused': {
      color: 'white',
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: 'white',
      color: 'white', 
    },
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: 'white',
        color: 'white', 
      },
      '&:hover fieldset': {
        borderColor: 'white',
        color: 'white', 
      },
      '&.Mui-focused fieldset': {
        borderColor: 'white',
        color: 'white', 
      },
      '& input': {
        color: 'white',
      },
    },
  }));
  */

  // Get authentications JSON.
  useEffect(() => {
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

  let navigate = useNavigate(); 
  const redirect = (p) => { 
      let path = p; 
      navigate(path);
  }

  // Sign the user in.
  const signIn = (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        if (json !== undefined) {
          if (json[userCredential.user.email] !== undefined) {
            redirect(`/profile/${json[userCredential.user.email].username}`)
          }
        }
        console.log(userCredential);
      })
      .catch((error) => {
        console.log(error);
      });
  };

  // Render the sign in page.
  return (
    <div className="sign-in-container">
      <form onSubmit={signIn}>
        <h1>Log In to your Account</h1>
        <div className="emailbox">
        <form>
          <input
            className="login-textbox" 
            fullWidth label="Email" 
            id="custom-css-outlined-input-email"        
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            placeholder="Enter your email"
            type="email"
            />
        </form>
        </div>
        <div className="passwordbox">
        <form>
          <input
            className="login-textbox" 
            fullWidth label="Password" 
            id="custom-css-outlined-input-password"        
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            placeholder="Enter your password"
            type="password"
            />
          </form>
        </div>
        <div><Link to="/signup" className="link">Don't have an account? Sign Up</Link></div>
        <center>
          <button className="login-button" type="submit">Log In</button>
        </center>
      </form>
    </div>
  );
};

export default SignIn;