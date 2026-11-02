import './movie.css'

import { app, auth } from '../FirebaseConfig';
import MovieQueue from '../util/MovieQueue';

import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import Footer from '../Footer';

import StarIcon from '@mui/icons-material/Star';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { tmdbImage, resizeTmdbUrl } from '../util/tmdb';

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
    const [director, setDirector] = useState('');
    const [logged, setLogged] = useState('Log');
    const [watchlist, setWatchlist] = useState('Add to Watchlist');
    const [favoriteMovies, setFavoriteMovies] = useState([]);
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
                if (json[username].films[i].id === id) {
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
                <img className="movie-poster" src={poster} alt={film == null ? '' : film.title + ' poster'}></img>
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
                    const favPromises = [];
                    let exists = false;
                    for (let i = 0; i < json[user].favoriteFilms.length; i++) {
                        if (json[user].favoriteFilms[i].id === id) {
                            exists = true;
                            break;
                        }
                    }
                    if (json[user].favoriteFilms.length === 5) {
                        if (!exists) {
                            for (let i = 0; i < json[user].favoriteFilms.length; i++) {
                                const favorite = json[user].favoriteFilms[i];
        
                                favPromises.push(fetch('https://api.themoviedb.org/3/movie/' + json[user].favoriteFilms[i].id + '?language=en-US', options).then(res => res.json()).then(json => json));
        
                                const res = [];
                                const movs = [];
                                Promise.all(favPromises).then(results => {
                                    for (let j = 0; j < results.length; j++) {
                                        let release = '';
                                        let poster = tmdbImage(results[j].poster_path, 'w342');
                
                                        if (results[j].release_date !== undefined) {
                                            release = results[j].release_date.split('-')[0];
                                        }
                                        for (let k = 0; k < json[user].favoriteFilms.length; k++) {
                                            if (json[user].favoriteFilms[k].id === results[j].id && json[user].favoriteFilms[k].poster !== undefined) {
                                                poster = resizeTmdbUrl(json[user].favoriteFilms[k].poster);
                                            }
                                        }
                                        const map = {
                                            poster: poster
                                        }
                                        res.push(map);
                                    }
                                    for (let i = 0; i < res.length; i++) {
                                        const movie = res[i];
                            
                                        if (movie === undefined) {
                                            continue;
                                        }
                                        movs.push(movie.poster);
                                    }
                                    setFavoriteMovies(movs);
                                });
                            }
                            handleOpen();
                        } else {
                            for (let i = 0; i < json[user].favoriteFilms.length; i++) {
                                if (json[user].favoriteFilms[i].id === id) {
                                    json[user].favoriteFilms.splice(i, 1);
                                    break;
                                }
                            }
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                            setIsFavorite('#ece7de');
                        }
                    } else {
                        if (!exists) {
                            json[user].favoriteFilms.push({
                                id: id
                            });
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                            setIsFavorite('#e0a84e');
                        } else {
                            for (let j = 0; j < json[user].favoriteFilms.length; j++) {
                                if (json[user].favoriteFilms[j].id === id) {
                                    json[user].favoriteFilms.splice(j, 1);
                                    break;
                                }
                            }
                            const set = async () => {
                                await setDoc(doc(getFirestore(app), "members", "member"), json);
                            }
                            set();
                            setIsFavorite('#ece7de');
                        }
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
                            <div className="favorite-movies-list">
                                <img loading="lazy" decoding="async" className="favorite-movie-poster" src={favoriteMovies[0]} onClick={() => {
                                    json[user].favoriteFilms[0].id = queue.get(0).id;
                                    const set = async () => {
                                        await setDoc(doc(getFirestore(app), "members", "member"), json);
                                    }
                                    set();
                                    handleClose();
                                    setIsFavorite('#e0a84e');
                                }}></img>
                                <img loading="lazy" decoding="async" className="favorite-movie-poster" src={favoriteMovies[1]} onClick={() => {
                                    json[user].favoriteFilms[1].id = queue.get(0).id;
                                    const set = async () => {
                                        await setDoc(doc(getFirestore(app), "members", "member"), json);
                                    }
                                    set();
                                    handleClose();
                                    setIsFavorite('#e0a84e');
                                }}></img>
                                <img loading="lazy" decoding="async" className="favorite-movie-poster" src={favoriteMovies[2]} onClick={() => {
                                    json[user].favoriteFilms[2].id = queue.get(0).id;
                                    const set = async () => {
                                        await setDoc(doc(getFirestore(app), "members", "member"), json);
                                    }
                                    set();
                                    handleClose();
                                    setIsFavorite('#e0a84e');
                                }}></img>
                                <img loading="lazy" decoding="async" className="favorite-movie-poster" src={favoriteMovies[3]} onClick={() => {
                                    json[user].favoriteFilms[3].id = queue.get(0).id;
                                    const set = async () => {
                                        await setDoc(doc(getFirestore(app), "members", "member"), json);
                                    }
                                    set();
                                    handleClose();
                                    setIsFavorite('#e0a84e');
                                }}></img>
                                <img loading="lazy" decoding="async" className="favorite-movie-poster" src={favoriteMovies[4]} onClick={() => {
                                    json[user].favoriteFilms[4].id = queue.get(0).id;
                                    const set = async () => {
                                        await setDoc(doc(getFirestore(app), "members", "member"), json);
                                    }
                                    set();
                                    handleClose();
                                    setIsFavorite('#e0a84e');
                                }}></img>
                                
                            </div>
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
                    console.log('log!');
                    const id = queue.get(0) == null ? 0 : queue.get(0).id;
                    let exists = false;

                    for (let i = 0; i < json[user].films.length; i++) {
                        if (json[user].films[i].id === id) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        json[user].films.push({
                            id: id
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
                        for (let j = 0; j < json[user].films.length; j++) {
                            if (json[user].films[j].id === id) {
                                json[user].films.splice(j, 1);
                                break;
                            }
                        }
                        json[user].filmsWatched = json[user].filmsWatched - 1;
                        setLogged('Log');
                        setWatchlist('Add to Watchlist');
                        const set = async () => {
                            await setDoc(doc(getFirestore(app), "members", "member"), json);
                        }
                        set();
                        setRating(0);
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
                            if (logged === 'Log') {
                                json[user].films.push({
                                    id: id
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
                                if (json[user].films[i].id === id) {
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

            <Footer />
        </div>
    )
}

export default Movie;