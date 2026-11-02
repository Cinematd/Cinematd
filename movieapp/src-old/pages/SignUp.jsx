import './signup.css';

import { auth, app } from "../FirebaseConfig";

import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { beforeAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';

import TextField from '@mui/material/TextField';

/**
 * SignUp component:
 * This component handles the sign up page. It handles the sign up functionality.
 */

const SignUp = () => {
  // Pair programming: Pride & Amer.
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [json, setJSON] = useState({});
  const [membersJson, setMembersJSON] = useState({});

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

  // Get members JSON.
  useEffect(() => {
    const getMembersJSON = async () => {
        const ref = collection(getFirestore(app), 'members');
    
        // await setDoc(doc(getFirestore(app), "members", "member"), json);
    
        const querySnapshot = await getDocs(collection(getFirestore(app), "members"));
        querySnapshot.forEach((doc) => {
            if (doc.data().test === undefined) {
                setMembersJSON(doc.data());
            }
        });
    }
    getMembersJSON();
  }, {});

  let navigate = useNavigate(); 
    const redirect = (p) => { 
      let path = p; 
      navigate(path);
    }

  const signUp = (e) => {
    e.preventDefault();

    // Try to create the user. If the user already exists, throw an error.
    // Or, if the username is already taken, throw an error.
    try {
      if (json !== undefined) {
        if (json[email] === undefined) {
          json['usernames'].forEach((user) => {
            if (user === username) {
              alert('Username already taken');
              throw Error('Account with this email already exists.');
            }
          });
          json[email] = {
            username: username,
            password: password,
            date: new Date().toLocaleDateString()
          };
        } else {
          alert('Account with this email already exists.');
          throw Error('Account with this email already exists.');
        }
      }
      createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
          const map = {
            username: username,
            uid: userCredential.user.uid
          }
          json['usernames'].push(map);

          const set = async () => {
            await setDoc(doc(getFirestore(app), "authentications", "auth"), json);
          }

          const membersMap = {
            name: username,
            bio: 'Hello Cinematd!',
            filmsWatched: 0,
            favoriteFilms: [],
            films: [],
            watchlist: [],
            reviews: [],
            friends: []
          }
          membersJson[username] = membersMap;

          const setMembers = async () => {
            await setDoc(doc(getFirestore(app), "members", "member"), membersJson);
          }

          const setNewUser = async () => {
            await setDoc(doc(getFirestore(app), "users", userCredential.user.uid), {username: username});
          }

          const setChatUp = async () => {
            await setDoc(doc(getFirestore(app), "userChats", userCredential.user.uid), {
              other: [],
              chatID: '0',
            });
          }

          async function update() {
            await set();
            await setMembers();
            await setNewUser();
            await setChatUp();
            redirect(`/profile/${username}`);
            window.location.reload();
          }
          update();

          console.log(map);
          // console.log(userCredential);
        })
        .catch((error) => {
          console.log(error);
      });
      
    } catch (exc) {
      console.log(exc);
    }
  };

  // Render the sign up page.
  return (
    <div className="sign-up-container">
      <form onSubmit={signUp}>
        <h1>Create Account</h1>
        <div className="userbox">
        <TextField 
            className="textbox" 
            fullWidth label="Username" 
            id="custom-css-outlined-input-user"        
            onChange={(e) => setUsername(e.target.value)}
            value={username}
            placeholder="Enter your username"
            type="username"
            />
        </div>
        <div className="emailbox">
        <TextField 
            className="textbox" 
            fullWidth label="Email" 
            id="custom-css-outlined-input-email"        
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            placeholder="Enter your email"
            type="email"
            />
        </div>
        <div className="passwordbox">
        <TextField 
            className="textbox" 
            fullWidth label="Password" 
            id="custom-css-outlined-input-password"        
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            placeholder="Enter your password"
            type="password"

            />
        </div>
        <div><Link to="/signin" className="link">Already have an account? Sign in</Link></div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default SignUp;