import { useContext, useEffect, useReducer, useState } from 'react';
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { app } from '../FirebaseConfig';
import { AuthContext } from '../context/AuthContext';

/**
 * Member data helpers.
 *
 * All members live in one Firestore document, members/member, keyed by
 * username; emails map to usernames in authentications. Pages read the
 * whole document, change the signed-in member's entry, and save it back.
 */

async function loadDoc(collectionName) {
    let data = null;
    const snapshot = await getDocs(collection(getFirestore(app), collectionName));
    snapshot.forEach((d) => {
        if (d.data().test === undefined) {
            data = d.data();
        }
    });
    return data || {};
}

export const loadMembers = () => loadDoc('members');
export const loadAuthentications = () => loadDoc('authentications');
export const saveMembers = (json) => setDoc(doc(getFirestore(app), 'members', 'member'), json);

/** Makes sure a member's record has the TV lists (older records don't). */
export function ensureTvLists(member) {
    if (!member) {
        return member;
    }
    member.shows = member.shows || [];
    member.seasons = member.seasons || [];
    member.tvWatchlist = member.tvWatchlist || [];
    member.favoriteShows = member.favoriteShows || [];
    member.reviews = member.reviews || [];
    member.posters = member.posters || {};
    return member;
}

/**
 * Loads the members document. Returns [json, refresh]: call refresh() after
 * changing json in place so the page re-renders.
 */
export function useMembers() {
    const [json, setJSON] = useState(null);
    const [, bump] = useReducer((n) => n + 1, 0);
    useEffect(() => {
        let cancelled = false;
        loadMembers().then((data) => { if (!cancelled) setJSON(data); });
        return () => { cancelled = true; };
    }, []);
    return [json, bump];
}

/** The signed-in member's username, or null if signed out / not found yet. */
export function useCurrentUsername() {
    const { authUser } = useContext(AuthContext);
    const [username, setUsername] = useState(null);
    useEffect(() => {
        if (!authUser) {
            setUsername(null);
            return;
        }
        let cancelled = false;
        loadAuthentications().then((auth) => {
            if (!cancelled && auth[authUser.email] !== undefined) {
                setUsername(auth[authUser.email].username);
            }
        });
        return () => { cancelled = true; };
    }, [authUser]);
    return username;
}
