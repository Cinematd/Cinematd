
import './navbarstyle.css'
import { Link, useMatch, useResolvedPath, useNavigate } from "react-router-dom" ;
import { onAuthStateChanged } from "firebase/auth";
import React, { useEffect, useState } from "react";
import { auth, app } from "./FirebaseConfig";
import firebase from 'firebase/compat/app';
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

/**
 * Navbar:
 * We create a navigation bar here that shows the Home page, Films page, Movie Map page, Members page, Chat page, and Profile page.
 * Another function here is, we see if the user is logged in or not, and
 * if they are, we redirect them to their profile page. Otherwise, we redirect
 * them to the sign in page.
 */

export default function Navbar() {
  // Pair programming: Pride & Amer.
  const [authUser, setAuthUser] = useState(null);
  const [json, setJSON] = useState({});
  const [profile, setProfile] = useState("/signin");

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
  }, []);

  useEffect(() => {
    const listen = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        if (json !== undefined && json[user.email] !== undefined) {
          setProfile("/profile/" + json[user.email].username);
        }
      } else {
        setAuthUser(null);
        setProfile("/signin");
      }
    });

    return () => {
      listen();
    };
  }, []);

  if (json !== undefined && authUser !== undefined && profile === "/signin") {
    if (authUser !== null) {
      if (json[authUser.email] !== undefined) {
        setProfile("/profile/" + json[authUser.email].username);
      }
    }
  }

  let navigate = useNavigate(); 
  const redirect = (p) => { 
      let path = p; 
      navigate(path);
  }

  // Once the page scrolls, the strip casts a shadow over the content.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <nav className={scrolled ? "nav nav--solid" : "nav"}>
      <Link to="/" className="site-title">Cinematd</Link>
      <ul className="nav-links">
          <CustomLink to="/home">Home</CustomLink>
          <CustomLink to="/films">Films</CustomLink>
          <CustomLink to="/moviemap">Movie Map</CustomLink>
          <CustomLink to="/members">Members</CustomLink>
          <CustomLink to="/chat">Chat</CustomLink>
          <li className="nav-profile">
            <Link to={profile} onClick={(e) => { 
              e.preventDefault();
              redirect(profile);
              window.location.reload();
            }}>Profile</Link>
          </li>
      </ul>
  </nav>
}

function CustomLink({ to, children, ...props }) {
  const resolvedPath = useResolvedPath(to)
  const isActive = useMatch({ path: resolvedPath.pathname, end: true })

  return (
    <li className={isActive ? "active" : ""}>
      <Link to={to} {...props}>
        {children}
      </Link>
    </li>
  )
}