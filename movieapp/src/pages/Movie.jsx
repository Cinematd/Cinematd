import './movie.css'

import { app, auth } from '../FirebaseConfig';
import MovieQueue from '../util/MovieQueue';

import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import Footer from '../Footer';
import FilmInfoPanel from './FilmInfoPanel';

import StarIcon from '@mui/icons-material/Star';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { tmdbImage, resizeTmdbUrl } from '../util/tmdb';
import { getMovieDetails, forEachLimited, normaliseTitle } from '../util/movieDetails';
import { customPosterPath, memberPosterUrl, fallBackTo } from '../util/posters';

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: import.meta.env.VITE_TMDB_AUTH
    }
};

/**
 * Movie component:
 * This component handles the movie page. It handles the displaying of the movie that the user
 * clicked on, including banner, poster, release date, director and description. It also handles the 
 * adding of the movie to the user's watchlist, the adding of the movie to the user's favorite films, and the logging of the movie.
 */

function Movie() {
    // Pair programming: Pride & Amer.
    const href = window.location.href;

    let query = '';
    let year = '';

    for (let i = href.length - 1; i >= 0; --i) {
        if (href.charAt(i) === '/') {
            break;
        }
        query += href.charAt(i);
    }
    for (let j = 0; j < 4; j++) {
        year += query.charAt(j);
    }
    query = query.substring(5, query.length).split('').reverse().join('');
    year = year.split('').reverse().join('');

    query = query.replaceAll('-', '%20');

    const queryUrl = 'https://api.themoviedb.org/3/search/movie?query=' + query + '&include_adult=false&language=en-US&page=1&year=' + year;

    // All of these state hooks to be used later and rendered/re-rendered when necessary.
    const queue = new MovieQueue();
    const [results, setResults] = useState([]);
    const [banner, setBanner] = useState('');
    const [poster, setPoster] = useState('');
    const [defaultPosterPath, setDefaultPosterPath] = useState(null);
    // Poster picker: open state, the film's TMDB posters (null until loaded),
    // and the member's choice made on this visit (undefined = use saved one).
    const [posterPickerOpen, setPosterPickerOpen] = useState(false);
    const [posterOptions, setPosterOptions] = useState(null);
    const [chosenPoster, setChosenPoster] = useState(undefined);
    const [director, setDirector] = useState('');
    const [logged, setLogged] = useState('Log');
    const [watchlist, setWatchlist] = useState('Add to Watchlist');
    // Favourites shown in the "pick one to replace" picker (null while loading).
    const [favoriteChoices, setFavoriteChoices] = useState(null);
    const [isFavorite, setIsFavorite] = useState('#ece7de');

    const [json, setJSON] = useState({});
    const [authJson, setAuthJSON] = useState({});
    const [authUser, setAuthUser] = useState(null);
    const [user, setUser] = useState(null);
    const [rating, setRating] = React.useState(0);
    const [updated, setUpdated] = useState(false);
    const [review, setReview] = useState('');
    // Which film the backdrop and credits were requested for, so they are
    // fetched once per film rather than on every render.
    const bannerRequestedFor = useRef(null);
    const creditsRequestedFor = useRef(null);

    
    const [open, setOpen] = React.useState(false);
    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
    const style = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(1200px, 92vw)',
        maxHeight: '90vh',
        overflowY: 'auto',
        bgcolor: '#141416',
        color: '#ece7de',
        border: '1px solid rgba(236, 231, 222, 0.12)',
        borderRadius: '4px',
        boxShadow: 24,
        p: 4,
    };

    // Get poster and set poster.
    useEffect(() => {
        if (queue.length === 0) {
            fetch(queryUrl, options)
                .then(res => res.json())
                .then(json => {
                    setResults(json.results);
                    setPoster(tmdbImage(json.results[0].poster_path, 'w780'));
                    setDefaultPosterPath(json.results[0].poster_path || null);
                })
                .catch(err => console.log(err))
        }
    }, []);

    // Get authentications JSON.
    useEffect(() => {
        const getAuthJSON = async () => {
            const ref = collection(getFirestore(app), 'authentications');
        
            // await setDoc(doc(getFirestore(app), "members", "member"), json);
        
            const querySnapshot = await getDocs(collection(getFirestore(app), "authentications"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setAuthJSON(doc.data());
                }
            });
        }
        getAuthJSON();
    }, []);

    // Get if user is logged in.
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

    // Get members JSON to be updated later if necessary.
    useEffect(() => {
        const getJSON = async () => {
            const ref = collection(getFirestore(app), 'members');
        
            // await setDoc(doc(getFirestore(app), "members", "member"), json);
        
            const querySnapshot = await getDocs(collection(getFirestore(app), "members"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setJSON(doc.data());
                }
            });
        }
        getJSON();
    }, []);

    // Get movie information and put movie information into a queue.
    for (let i = 0; i < results.length; i++) {
        const result = results[i];

        if (result.title !== null) {
            let original_title = '', title = result.title;
            if (result.original_language !== 'en') {
                title = result.original_title;
                original_title = result.title;
            }
            const map = {
                id: result.id,
                title: title,
                optional_title: original_title,
                description: result.overview,
                release: result.release_date,
                poster: tmdbImage(result.poster_path),
                backdrop: 'https://image.tmdb.org/t/p/w1280' + result.backdrop_path,
                popularity: result.popularity
            };
            queue.enqueue(map);
            break;
        }
    }
    // Movie ID
    const id = queue.get(0) == null ? 0 : queue.get(0).id;

    // A logged-film entry counts as this film if it has the same TMDB id or the
    // same name (the page finds films by title, so one film can end up logged
    // under more than one id). Entries store title / original_title once known.
    const currentNames = new Set(
        [queue.get(0) == null ? '' : queue.get(0).title, queue.get(0) == null ? '' : queue.get(0).optional_title]
            .map(normaliseTitle)
            .filter(name => name !== '')
    );
    const isCurrentFilm = (entry) => {
        if (!entry) {
            return false;
        }
        if (String(entry.id) === String(id)) {
            return true;
        }
        return currentNames.has(normaliseTitle(entry.title)) || currentNames.has(normaliseTitle(entry.original_title));
    };

    // ---------- Member's chosen poster ----------
    // Logged-in members can pick any of the film's current TMDB posters by
    // clicking the poster. The choice is saved as json[user].posters[filmId]
    // and shown on their own pages (see util/posters.js) and to them here.
    const savedPosterPath = user !== null ? customPosterPath(json[user], id) : null;
    const activePosterPath = chosenPoster !== undefined ? chosenPoster : savedPosterPath;
    const displayPoster = activePosterPath ? tmdbImage(activePosterPath, 'w780') : poster;

    const savePosterChoice = (path) => {
        if (user === null || json[user] === undefined || !id) {
            return;
        }
        if (!json[user].posters) {
            json[user].posters = {};
        }
        // Choosing TMDB's default poster is the same as having no choice.
        const choice = path && path !== defaultPosterPath ? path : null;
        if (choice) {
            json[user].posters[String(id)] = choice;
        } else {
            delete json[user].posters[String(id)];
        }
        // Older versions saved a poster on each list entry; drop those for this
        // film so the choice above is used everywhere.
        for (const list of ['films', 'favoriteFilms', 'watchlist']) {
            for (const entry of json[user][list] || []) {
                if (entry && String(entry.id) === String(id)) {
                    delete entry.poster;
                }
            }
        }
        setChosenPoster(choice);
        setDoc(doc(getFirestore(app), "members", "member"), json);
    };

    // Loads the film's current posters from TMDB. Resolves to the list of file
    // paths, or null if TMDB couldn't be reached.
    const loadPosterOptions = () => {
        if (posterOptions !== null) {
            return Promise.resolve(posterOptions);
        }
        if (!id) {
            return Promise.resolve(null);
        }
        return fetch('https://api.themoviedb.org/3/movie/' + id + '/images', options)
            .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
            .then(images => {
                const paths = (images.posters || []).map(p => p.file_path).filter(Boolean);
                setPosterOptions(paths);
                return paths;
            })
            .catch(() => null);
    };

    const openPosterPicker = () => {
        setPosterPickerOpen(true);
        loadPosterOptions();
    };

    // If the chosen poster has been removed from TMDB, go back to the default.
    const posterCheckedFor = useRef(null);
    useEffect(() => {
        if (!savedPosterPath || chosenPoster !== undefined || posterCheckedFor.current === id) {
            return;
        }
        posterCheckedFor.current = id;
        loadPosterOptions().then(paths => {
            if (paths !== null && !paths.includes(savedPosterPath)) {
                savePosterChoice(null);
            }
        });
    }, [savedPosterPath, id]);

    // Get and set current user.
    if (authJson !== null && authUser !== null && user === null) {
        if (authJson[authUser.email] !== undefined) {
            setUser(authJson[authUser.email].username);
        }
    }

    // See if user already has the movie in their watchlist, favorite films, or logged films.
    // If so, update the button to reflect that.
    if (authUser !== null && authJson !== null && json !== null && user !== null && json[user] !== undefined && !updated) {
        const username = user;

        console.log(username);

        let exists = false;
        let addedToWatch = false;
        let movieRating = 0;

        console.log(json);

        if (json[username] !== undefined) {
            for (let i = 0; i < json[user].favoriteFilms.length; i++) {
                if (json[user].favoriteFilms[i].id === id) {
                    setIsFavorite('#e0a84e');
                    break;
                }
            }
            for (let i = 0; i < json[username].films.length; i++) {
                if (isCurrentFilm(json[username].films[i])) {
                    exists = true;
                    movieRating = json[username].films[i].rating;
                    break;
                }
            }
            if (exists) {
                setWatchlist('Watched');
                setLogged('Logged');
                setRating(movieRating);
            } else {
                if (json[username].watchlist === undefined) {
                    json[username].watchlist = [];
                    const set = async () => {
                        await setDoc(doc(getFirestore(app), "members", "member"), json);
                    }
                    set();
                } else {
                    for (let j = 0 ; j < json[username].watchlist.length; j++) {
                        if (json[username].watchlist[j].id === id) {
                            addedToWatch = true;
                            break;
                        }
                    }
                }
                if (addedToWatch) {
                    setWatchlist('Added to Watchlist');
                }
            }
        }
        setUpdated(true);
    }

    // Set banner.
    if (banner === '' && id && bannerRequestedFor.current !== id) {
        bannerRequestedFor.current = id;
        fetch('https://api.themoviedb.org/3/movie/' + id + '/images?include_image_language=null', options)
          .then(res => res.json())
          .then(json => {
                const breakRandom = Math.floor(Math.random() * json.backdrops.length);
                let index = 0;
                for (let i = 0; i < json.backdrops.length; i++) {
                    if (i == breakRandom) {
                        index = i;
                        break;
                    }
                }
                setBanner('https://image.tmdb.org/t/p/w1280' + json.backdrops[index].file_path);
                return;
            })
          .catch(err => console.error('error:' + err));
    }

    // Set director.
    if (director === '' && id && creditsRequestedFor.current !== id) {
        creditsRequestedFor.current = id;
        let dir = [];
        let d = '';
        fetch('https://api.themoviedb.org/3/movie/' + id + '/credits?language=en-US', options)
            .then(res => res.json())
            .then(json => {
                const crew = json.crew;

                for (let j = 0; j < crew.length; j++) {
                    const member = crew[j];

                    if (member.job === 'Director') {
                        dir.push(member.name);
                    }
                }
                for (let k = 0; k < dir.length; k++) {
                    if (k !== dir.length - 1) {
                        d += dir[k] + ', ';
                    } else {
                        d += dir[k];
                    }
                }
                setDirector(d);
            })
            .catch(err => console.log(err));
    }

    // Change release year to make it more understandable.
    let releaseYear = '';
    let release = '';
    const date = queue.get(0) == null ? '' : queue.get(0).release.split('-');

    switch (date[1]) {
        case '01':
            releaseYear = 'January';
            break;
        case '02': 
            releaseYear = 'February';
            break;
        case '03': 
            releaseYear = 'March';
            break;
        case '04':
            releaseYear = 'April';
            break;
        case '05':
            releaseYear = 'May';
            break;
        case '06':
            releaseYear = 'June';
            break;
        case '07':
            releaseYear = 'July';
            break;
        case '08':
            releaseYear = 'August';
            break;
        case '09':
            releaseYear = 'September';
            break;
        case '10':
            releaseYear = 'October';
            break;
        case '11':
            releaseYear = 'November';
            break;
        case '12':
            releaseYear = 'December';
            break;
        default: break;
    }
    release = releaseYear + ' ' + date[2] + ', ' + date[0];

    let navigate = useNavigate(); 
    const redirect = (p) => { 
        let path = p; 
        navigate(path);
    }

    const film = queue.get(0);

    // Render the movie page.
    return (
        <div className="movie-container">
            <div className="movie-hero">
                <div className="movie-banner-image" style={{backgroundImage: "url(" + banner + ")"}}></div>
            </div>
            <div className="movie-information">
                {user !== null ? (
                    <button type="button" className="movie-poster-button" onClick={openPosterPicker} aria-label="Change poster">
                        <img className="movie-poster" src={displayPoster} alt={film == null ? '' : film.title + ' poster'} onError={(e) => {
                            if (!activePosterPath) {
                                return;
                            }
                            // Show the default poster now; if TMDB no longer lists the
                            // chosen one, clear the choice for good.
                            fallBackTo(poster)(e);
                            const broken = activePosterPath;
                            loadPosterOptions().then(paths => {
                                if (paths !== null && !paths.includes(broken)) {
                                    savePosterChoice(null);
                                }
                            });
                        }}></img>
                        <span className="movie-poster-hint">Change poster</span>
                    </button>
                ) : (
                    <img className="movie-poster" src={poster} alt={film == null ? '' : film.title + ' poster'}></img>
                )}
                <Modal
                    open={posterPickerOpen}
                    onClose={() => setPosterPickerOpen(false)}
                    aria-labelledby="poster-picker-title">
                    <Box sx={style}>
                        <span className="modal-title" id="poster-picker-title">Choose a poster</span>
                        <p className="poster-picker-note">Your choice shows on your profile, watchlist and logged films, for anyone who visits them.</p>
                        {posterOptions === null ? (
                            <p className="poster-picker-note">Loading posters…</p>
                        ) : posterOptions.length === 0 ? (
                            <p className="poster-picker-note">TMDB has no other posters for this film yet.</p>
                        ) : (
                            <div className="poster-picker-grid">
                                {posterOptions.map(path => {
                                    const isDefault = path === defaultPosterPath;
                                    const selected = activePosterPath ? path === activePosterPath : isDefault;
                                    return (
                                        <button
                                            type="button"
                                            key={path}
                                            className={'poster-option' + (selected ? ' is-selected' : '')}
                                            aria-pressed={selected}
                                            aria-label={isDefault ? 'Default poster' : 'Poster option'}
                                            onClick={() => {
                                                savePosterChoice(path);
                                                setPosterPickerOpen(false);
                                            }}>
                                            <img loading="lazy" decoding="async" src={tmdbImage(path, 'w185')} alt=""></img>
                                            {isDefault ? <span className="poster-option-label">Default</span> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {activePosterPath ? (
                            <button type="button" className="btn-ghost poster-picker-reset" onClick={() => {
                                savePosterChoice(null);
                                setPosterPickerOpen(false);
                            }}>Use the default poster</button>
                        ) : null}
                    </Box>
                </Modal>
                <div className="movie-details">
                    <div className="title">
                        <h1>{`${film == null ? '' : film.title}`}</h1>
                        {film != null && film.optional_title && film.optional_title !== film.title ? (
                            <p className="optional-title"><i>{film.optional_title}</i></p>
                        ) : null}
                    </div>
                    <div className="movie-header">
                        <p className="credit"><span className="credit-role">Directed by</span> {`${director}`}</p>
                        <p className="credit">{`${release}`}</p>
                    </div>
                    <div className="description">
                        <p>{`${film == null ? '' : film.description}`}</p>
                    </div>
            <div className="add-to-section">
                <button className="add-to-watchlist-button" onClick={() => {
                    if (user === null) {
                        redirect('/signin');
                        return;
                    }
                    const id = queue.get(0) == null ? 0 : queue.get(0).id;
                    let exists = false;
                    let watched = false;

                    for (let i = 0; i < json[user].films.length; i++) {
                        if (json[user].films[i].id === id) {
                            watched = true;
                            break;
                        }
                    }
                    if (!watched) {
                        for (let i = 0; i < json[user].watchlist.length; i++) {
                            if (json[user].watchlist[i].id === id) {
                                exists = true;
                                break;
                            }
                        }
                        if (!exists) {
                            json[user].watchlist.push({
                                id: id
                            });
                            setWatchlist('Added to Watchlist');
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                        } else {
                            for (let j = 0; j < json[user].watchlist.length; j++) {
                                if (json[user].watchlist[j].id === id) {
                                    console.log(j);
                                    json[user].watchlist.splice(j, 1);
                                    break;
                                }
                            }
                            setWatchlist('Add to Watchlist');
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                        }
                    }
                }}>{watchlist}
                </button>

                <button className='add-to-favorite-button' aria-label="Favorite" onClick={() => {
                    if (user === null || json[user] === undefined) {
                        redirect('/signin');
                        return;
                    }
                    const filmId = queue.get(0) == null ? id : queue.get(0).id;
                    const favorites = json[user].favoriteFilms;
                    const save = () => setDoc(doc(getFirestore(app), "members", "member"), json);

                    if (favorites.some(entry => entry && String(entry.id) === String(filmId))) {
                        // Already a favourite: remove it.
                        json[user].favoriteFilms = favorites.filter(entry => !entry || String(entry.id) !== String(filmId));
                        save();
                        setIsFavorite('#ece7de');
                    } else if (favorites.length < 5) {
                        favorites.push({ id: filmId });
                        save();
                        setIsFavorite('#e0a84e');
                    } else {
                        // Favourites are full: show the member's current five (with
                        // the posters they chose) so they can pick one to replace.
                        const current = favorites.slice(0, 5);
                        setFavoriteChoices(null);
                        handleOpen();
                        Promise.all(current.map(entry => getMovieDetails(entry.id))).then(details => {
                            setFavoriteChoices(current.map((entry, index) => {
                                const film = details[index];
                                return {
                                    index: index,
                                    title: film ? (film.title || film.original_title) : 'Film unavailable',
                                    poster: memberPosterUrl(json[user], entry.id, film ? film.poster_path : null, 'w342', entry.poster),
                                    defaultPoster: film ? tmdbImage(film.poster_path, 'w342') : ''
                                };
                            }));
                        });
                    }
            }}><FavoriteIcon style={{color: isFavorite}}/></button>
                <Modal
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description">
                        
                    <Box sx={style}>
                        <Typography id="modal-modal-title" variant="h6" component="h2">
                            <span className="modal-title">Your favorites are full. Pick one to replace.</span>
                        </Typography>
                        <Typography id="modal-modal-description" sx={{ mt: 2 }}>
                            {favoriteChoices === null ? (
                                <p className="poster-picker-note">Loading your favourites…</p>
                            ) : (
                                <div className="favorite-movies-list">
                                    {favoriteChoices.map(choice => (
                                        <button type="button" key={choice.index} className="favorite-choice" aria-label={'Replace ' + choice.title} onClick={() => {
                                            // A fresh entry, so nothing from the replaced film carries over.
                                            json[user].favoriteFilms[choice.index] = { id: queue.get(0) == null ? id : queue.get(0).id };
                                            setDoc(doc(getFirestore(app), "members", "member"), json);
                                            handleClose();
                                            setIsFavorite('#e0a84e');
                                        }}>
                                            <img loading="lazy" decoding="async" className="favorite-movie-poster" src={choice.poster} alt="" onError={fallBackTo(choice.defaultPoster)}></img>
                                            <span className="favorite-choice-title">{choice.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </Typography>
                    </Box>
                </Modal>
                
                {/* <button className="add-to-favorite-button" onClick={() => {
                    // Favorite stuff
                    if (user === null) {
                        redirect('/signin');
                        return;
                    }
                }}>Fav<StarIcon />rite</button> */}

                <button className="log-button" onClick={() => {
                    if (user === null) {
                        redirect('/signin');
                        return;
                    }
                    const film = queue.get(0);
                    const id = film == null ? 0 : film.id;
                    const exists = json[user].films.some(isCurrentFilm);

                    if (!exists) {
                        json[user].films.push({
                            id: id,
                            title: film == null ? '' : film.title,
                            original_title: film == null ? '' : film.optional_title
                        });
                        json[user].filmsWatched = json[user].filmsWatched + 1;
                        for (let j = 0; j < json[user].watchlist.length; j++) {
                            if (json[user].watchlist[j].id === id) {
                                json[user].watchlist.splice(j, 1);
                                break;
                            }
                        }
                        setLogged('Logged');
                        setWatchlist('Watched');
                        const set = async () => {
                            await setDoc(doc(getFirestore(app), "members", "member"), json);
                        }
                        set();
                    } else {
                        // Unlog: remove every entry for this film from the member's
                        // logged films, matching by id or by name.
                        const removeMatches = () => {
                            const before = json[user].films.length;
                            json[user].films = json[user].films.filter(entry => !isCurrentFilm(entry));
                            const removed = before - json[user].films.length;
                            json[user].filmsWatched = Math.max(0, (json[user].filmsWatched || 0) - removed);
                            return removed;
                        };
                        const save = () => setDoc(doc(getFirestore(app), "members", "member"), json);

                        setLogged('Log');
                        setWatchlist('Add to Watchlist');
                        setRating(0);

                        const unlog = async () => {
                            // Entries we can already match (same id or a stored name).
                            removeMatches();
                            await save();

                            // Older entries were saved without a name: look their names up,
                            // store them for next time, and remove any that are this film.
                            const unnamed = json[user].films.filter(entry => entry && !entry.title && !entry.original_title);
                            if (unnamed.length === 0) {
                                return;
                            }
                            await forEachLimited(unnamed, 8, entry => getMovieDetails(entry.id), (details, entry) => {
                                if (details) {
                                    entry.title = details.title || '';
                                    entry.original_title = details.original_title || '';
                                }
                            });
                            removeMatches();
                            await save();
                        };
                        unlog();
                    }
                }}>{
                    logged
                }</button>
                <div className="review-section">
                        <Rating className='star-rating-icon' size='medium' precision={0.5} value={rating} onChange={(event, newValue) => {
                            if (user === null) {
                                redirect('/signin');
                                return;
                            }
                            if (logged === 'Log' && !json[user].films.some(isCurrentFilm)) {
                                json[user].films.push({
                                    id: id,
                                    title: queue.get(0) == null ? '' : queue.get(0).title,
                                    original_title: queue.get(0) == null ? '' : queue.get(0).optional_title
                                });
                                json[user].filmsWatched = json[user].filmsWatched + 1;
                                for (let j = 0; j < json[user].watchlist.length; j++) {
                                    if (json[user].watchlist[j].id === id) {
                                        json[user].watchlist.splice(j, 1);
                                        break;
                                    }
                                }
                                setLogged('Logged');
                                setWatchlist('Watched');
                            }
                            for (let i = 0; i < json[user].films.length; i++) {
                                if (isCurrentFilm(json[user].films[i])) {
                                    json[user].films[i].rating = newValue;
                                    break;
                                }
                            }
                            setRating(newValue);
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                        }}/>
                        {/* <TextField id="outlined-textarea" label="Text here:" placeholder="Placeholder" multiline/> */}
                        <Box  sx={{ width: 800, maxWidth: '100%',}}>  
                            <TextField className="textbox" fullWidth multiline minRows={3} variant="standard" label="Write a review" id="review-text" onChange={(e) => { setReview(e.target.value); }}/>
                            
                        </Box>
                        <button className="submit-review-button btn-screen" onClick={() => {
                            // Review stuff
                            if (user === null) {
                                redirect('/signin');
                                return;
                            }
                            const alphabet = [];
                            const lower = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
                            for (let alph = 0; alph < lower.length; alph++) {
                                alphabet.push(lower[alph]);
                                const upper = lower[alph].toUpperCase();
                                alphabet.push(upper);
                            }
                            const digit = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

                            let uniqueReviewId = '';
                            uniqueReviewId += alphabet[Math.floor(Math.random() * alphabet.length)];
                            uniqueReviewId += digit[Math.floor(Math.random() * digit.length)];
                            uniqueReviewId += alphabet[Math.floor(Math.random() * alphabet.length)];
                            uniqueReviewId += digit[Math.floor(Math.random() * digit.length)];
                            uniqueReviewId += alphabet[Math.floor(Math.random() * alphabet.length)];
                            uniqueReviewId += digit[Math.floor(Math.random() * digit.length)];

                            let poster = queue.get(0) !== null ? queue.get(0).poster : '';
                            for (let j = 0; j < json[user].films.length; j++) {
                                if (json[user].films[j].id === queue.get(0).id) {
                                    if (json[user].films[j].poster !== undefined) {
                                        poster = resizeTmdbUrl(json[user].films[j].poster);
                                    }
                                }
                            }
                            if (activePosterPath) {
                                poster = tmdbImage(activePosterPath);
                            }

                            json[user].reviews.push(
                                {
                                    reviewId: uniqueReviewId,
                                    title: queue.get(0) !== null ? queue.get(0).title : '',
                                    year: queue.get(0) !== null ? queue.get(0).release.split('-')[0] : '',
                                    poster: poster,
                                    rating: rating,
                                    date: new Date().toLocaleDateString(),
                                    review: review
                                }
                            );
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                        }}>Save review</button>

                        {/* <label><textarea name="postContent" rows={4} cols={40} /> </label> */}
                </div>
            </div>
                </div>
            </div>

            <FilmInfoPanel filmId={id} title={film == null ? '' : film.title} />

            <Footer />
        </div>
    )
}

export default Movie;