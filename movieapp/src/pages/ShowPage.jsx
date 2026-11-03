import './movie.css';
import './showpage.css';

import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import FavoriteIcon from '@mui/icons-material/Favorite';

import Footer from '../Footer';
import FilmInfoPanel from './FilmInfoPanel';
import { tmdbImage } from '../util/tmdb';
import { getShowDetails } from '../util/movieDetails';
import { customPosterPath, posterKey, fallBackTo } from '../util/posters';
import { ensureTvLists, saveMembers, useCurrentUsername, useMembers } from '../util/members';
import { tmdbOptions, airYears, seasonLabel, yearOf } from '../util/tv';
import { AuthContext } from '../context/AuthContext';

const MAX_FAVORITES = 5;

const modalStyle = {
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

function makeReviewId() {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let id = '';
    for (let i = 0; i < 3; i++) {
        id += letters[Math.floor(Math.random() * letters.length)];
        id += Math.floor(Math.random() * 10);
    }
    return id;
}

function formatDate(iso) {
    if (!iso) {
        return '';
    }
    const date = new Date(iso + 'T00:00:00');
    return isNaN(date) ? iso : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/**
 * ShowPage component:
 * The TV counterpart of the Movie page, built on the same blueprint: a
 * widescreen still, the poster (members can choose their own), credits and
 * overview, and actions to watchlist, favourite, log, rate and review the
 * show. Below, every season can be logged and rated on its own. The right
 * drawer has cast, crew, details and air dates.
 *
 * Member data (on the member's record in members/member):
 *   shows:         [{ id, title, original_title, rating? }]   logged shows
 *   seasons:       [{ showId, season, title, rating? }]       logged seasons
 *   tvWatchlist:   [{ id }]
 *   favoriteShows: [{ id }]  (up to 5)
 *   reviews:       [{ ..., type: 'tv', showId }]
 *   posters:       { "tv:<id>": "/path.jpg" }
 */
function ShowPage() {
    const { showId } = useParams();
    const id = parseInt(showId, 10);
    const navigate = useNavigate();

    const [show, setShow] = useState(null);
    const [failed, setFailed] = useState(false);
    const [json, refresh] = useMembers();
    const username = useCurrentUsername();
    const { authUser, authReady } = useContext(AuthContext);
    const member = json && username && json[username] ? ensureTvLists(json[username]) : null;

    const [review, setReview] = useState('');
    const [reviewSaved, setReviewSaved] = useState(false);
    const [favoritesOpen, setFavoritesOpen] = useState(false);
    const [favoriteShows, setFavoriteShows] = useState([]);
    const [posterPickerOpen, setPosterPickerOpen] = useState(false);
    const [posterOptions, setPosterOptions] = useState(null);
    const posterCheckedFor = useRef(null);

    // Show details (with seasons) from TMDB.
    useEffect(() => {
        if (!id) {
            setFailed(true);
            return;
        }
        let cancelled = false;
        setShow(null);
        setFailed(false);
        fetch(`https://api.themoviedb.org/3/tv/${id}?language=en-US`, tmdbOptions)
            .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
            .then(data => { if (!cancelled) setShow(data); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [id]);

    const save = () => {
        saveMembers(json);
        refresh();
    };

    // Signed-out visitors are sent to log in before any action. While a
    // signed-in member's data is still loading, actions just wait.
    const requireMember = () => {
        if (member) {
            return true;
        }
        if (authReady && !authUser) {
            navigate('/signin');
        }
        return false;
    };

    // ---------- State derived from the member's record ----------
    const sameShow = (entry) => entry && String(entry.id) === String(id);
    const loggedEntry = member ? member.shows.find(sameShow) : null;
    const isLogged = !!loggedEntry;
    const onWatchlist = member ? member.tvWatchlist.some(sameShow) : false;
    const isFavorite = member ? member.favoriteShows.some(sameShow) : false;
    const seasonEntry = (number) => (member ? member.seasons.find(s => String(s.showId) === String(id) && s.season === number) : null);

    const defaultPosterPath = show ? show.poster_path : null;
    const chosenPosterPath = member ? customPosterPath(member, id, 'tv') : null;
    const posterUrl = tmdbImage(chosenPosterPath || defaultPosterPath, 'w780');
    const defaultPosterUrl = tmdbImage(defaultPosterPath, 'w780');

    // ---------- Actions ----------
    const toggleWatchlist = () => {
        if (!requireMember() || isLogged) {
            return;
        }
        if (onWatchlist) {
            member.tvWatchlist = member.tvWatchlist.filter(e => !sameShow(e));
        } else {
            member.tvWatchlist.push({ id });
        }
        save();
    };

    const logShow = (rating) => {
        member.shows.push({ id, title: show.name, original_title: show.original_name, ...(rating ? { rating } : {}) });
        member.tvWatchlist = member.tvWatchlist.filter(e => !sameShow(e));
    };

    const toggleLog = () => {
        if (!requireMember() || !show) {
            return;
        }
        if (isLogged) {
            // Unlog: remove every entry for this show.
            member.shows = member.shows.filter(e => !sameShow(e));
        } else {
            logShow();
        }
        save();
    };

    const rateShow = (value) => {
        if (!requireMember() || !show) {
            return;
        }
        if (!isLogged) {
            logShow(value);
        } else {
            loggedEntry.rating = value;
        }
        save();
    };

    const toggleSeason = (season) => {
        if (!requireMember() || !show) {
            return;
        }
        if (seasonEntry(season.season_number)) {
            member.seasons = member.seasons.filter(s => !(String(s.showId) === String(id) && s.season === season.season_number));
        } else {
            member.seasons.push({ showId: id, season: season.season_number, title: show.name });
        }
        save();
    };

    const rateSeason = (season, value) => {
        if (!requireMember() || !show) {
            return;
        }
        const entry = seasonEntry(season.season_number);
        if (entry) {
            entry.rating = value;
        } else {
            member.seasons.push({ showId: id, season: season.season_number, title: show.name, rating: value });
        }
        save();
    };

    const toggleFavorite = () => {
        if (!requireMember()) {
            return;
        }
        if (isFavorite) {
            member.favoriteShows = member.favoriteShows.filter(e => !sameShow(e));
            save();
        } else if (member.favoriteShows.length >= MAX_FAVORITES) {
            // Favourites are full: let the member pick one to replace.
            Promise.all(member.favoriteShows.map(f => getShowDetails(f.id))).then(details => {
                setFavoriteShows(details.map((d, i) => ({
                    index: i,
                    poster: d ? tmdbImage(customPosterPath(member, d.id, 'tv') || d.poster_path, 'w342') : '',
                    name: d ? d.name : ''
                })));
                setFavoritesOpen(true);
            });
        } else {
            member.favoriteShows.push({ id });
            save();
        }
    };

    const replaceFavorite = (index) => {
        member.favoriteShows[index] = { id };
        setFavoritesOpen(false);
        save();
    };

    const saveReview = () => {
        if (!requireMember() || !show) {
            return;
        }
        member.reviews.push({
            reviewId: makeReviewId(),
            type: 'tv',
            showId: id,
            title: show.name,
            year: yearOf(show.first_air_date),
            poster: tmdbImage(chosenPosterPath || defaultPosterPath),
            rating: loggedEntry && loggedEntry.rating ? loggedEntry.rating : 0,
            date: new Date().toLocaleDateString(),
            review: review
        });
        save();
        setReviewSaved(true);
    };

    // ---------- Poster picker (same as the Movie page) ----------
    const savePosterChoice = (path) => {
        if (!member) {
            return;
        }
        const key = posterKey(id, 'tv');
        if (path && path !== defaultPosterPath) {
            member.posters[key] = path;
        } else {
            delete member.posters[key];
        }
        save();
    };

    const loadPosterOptions = () => {
        if (posterOptions !== null) {
            return Promise.resolve(posterOptions);
        }
        return fetch(`https://api.themoviedb.org/3/tv/${id}/images`, tmdbOptions)
            .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
            .then(images => {
                const paths = (images.posters || []).map(p => p.file_path).filter(Boolean);
                setPosterOptions(paths);
                return paths;
            })
            .catch(() => null);
    };

    // If the chosen poster has been removed from TMDB, go back to the default.
    useEffect(() => {
        if (!chosenPosterPath || !show || posterCheckedFor.current === id) {
            return;
        }
        posterCheckedFor.current = id;
        loadPosterOptions().then(paths => {
            if (paths !== null && !paths.includes(chosenPosterPath)) {
                savePosterChoice(null);
            }
        });
    }, [chosenPosterPath, show, id]);

    // ---------- Render ----------
    if (failed) {
        return (
            <div className="movie-container">
                <div className="movie-information show-missing">
                    <div className="movie-details">
                        <div className="title"><h1>Show not found</h1></div>
                        <p className="credit">TMDB couldn't find this show. Check the link, or find it from the TV page.</p>
                    </div>
                </div>
            </div>
        );
    }

    const creators = show ? (show.created_by || []).map(c => c.name).join(', ') : '';
    const networks = show ? (show.networks || []).map(n => n.name).join(', ') : '';
    const seasons = show ? (show.seasons || []).slice().sort((a, b) => (a.season_number === 0) - (b.season_number === 0) || a.season_number - b.season_number) : [];

    return (
        <div className="movie-container">
            <div className="movie-hero">
                <div className="movie-banner-image" style={{ backgroundImage: show && show.backdrop_path ? `url(${tmdbImage(show.backdrop_path, 'w1280')})` : undefined }}></div>
            </div>
            <div className="movie-information">
                {member ? (
                    <button type="button" className="movie-poster-button" aria-label="Change poster" onClick={() => { setPosterPickerOpen(true); loadPosterOptions(); }}>
                        <img className="movie-poster" src={posterUrl} alt={show ? show.name + ' poster' : ''} onError={(e) => {
                            if (!chosenPosterPath) {
                                return;
                            }
                            fallBackTo(defaultPosterUrl)(e);
                            const broken = chosenPosterPath;
                            loadPosterOptions().then(paths => {
                                if (paths !== null && !paths.includes(broken)) {
                                    savePosterChoice(null);
                                }
                            });
                        }}></img>
                        <span className="movie-poster-hint">Change poster</span>
                    </button>
                ) : (
                    <img className="movie-poster" src={defaultPosterUrl} alt={show ? show.name + ' poster' : ''}></img>
                )}

                <Modal open={posterPickerOpen} onClose={() => setPosterPickerOpen(false)} aria-labelledby="poster-picker-title">
                    <Box sx={modalStyle}>
                        <span className="modal-title" id="poster-picker-title">Choose a poster</span>
                        <p className="poster-picker-note">Your choice shows on your profile, TV watchlist and logged shows, for anyone who visits them.</p>
                        {posterOptions === null ? (
                            <p className="poster-picker-note">Loading posters…</p>
                        ) : posterOptions.length === 0 ? (
                            <p className="poster-picker-note">TMDB has no other posters for this show yet.</p>
                        ) : (
                            <div className="poster-picker-grid">
                                {posterOptions.map(path => {
                                    const isDefault = path === defaultPosterPath;
                                    const selected = chosenPosterPath ? path === chosenPosterPath : isDefault;
                                    return (
                                        <button type="button" key={path} className={'poster-option' + (selected ? ' is-selected' : '')} aria-pressed={selected}
                                            aria-label={isDefault ? 'Default poster' : 'Poster option'}
                                            onClick={() => { savePosterChoice(path); setPosterPickerOpen(false); }}>
                                            <img loading="lazy" decoding="async" src={tmdbImage(path, 'w185')} alt=""></img>
                                            {isDefault ? <span className="poster-option-label">Default</span> : null}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                        {chosenPosterPath ? (
                            <button type="button" className="btn-ghost poster-picker-reset" onClick={() => { savePosterChoice(null); setPosterPickerOpen(false); }}>Use the default poster</button>
                        ) : null}
                    </Box>
                </Modal>

                <div className="movie-details">
                    <div className="title">
                        <h1>{show ? show.name : ''}</h1>
                        {show && show.original_name && show.original_name !== show.name ? (
                            <p className="optional-title"><i>{show.original_name}</i></p>
                        ) : null}
                    </div>
                    {show ? (
                        <div className="movie-header">
                            {creators ? <p className="credit"><span className="credit-role">Created by</span> {creators}</p> : null}
                            {airYears(show) ? <p className="credit">{airYears(show)}</p> : null}
                            {networks ? <p className="credit"><span className="credit-role">On</span> {networks}</p> : null}
                            {show.number_of_seasons ? <p className="credit">{show.number_of_seasons} season{show.number_of_seasons === 1 ? '' : 's'}</p> : null}
                        </div>
                    ) : null}
                    <div className="description">
                        <p>{show ? show.overview : ''}</p>
                    </div>

                    <div className="add-to-section">
                        <button className="add-to-watchlist-button" onClick={toggleWatchlist}>
                            {isLogged ? 'Watched' : onWatchlist ? 'On your watchlist' : 'Add to Watchlist'}
                        </button>
                        <button className="add-to-favorite-button" aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'} aria-pressed={isFavorite} onClick={toggleFavorite}>
                            <FavoriteIcon style={{ color: isFavorite ? '#e0a84e' : '#ece7de' }}/>
                        </button>
                        <button className="log-button" onClick={toggleLog}>{isLogged ? 'Logged' : 'Log'}</button>

                        <Modal open={favoritesOpen} onClose={() => setFavoritesOpen(false)} aria-labelledby="favorite-shows-title">
                            <Box sx={modalStyle}>
                                <span className="modal-title" id="favorite-shows-title">Your favourite shows are full. Pick one to replace.</span>
                                <div className="favorite-movies-list">
                                    {favoriteShows.map(f => (
                                        <img key={f.index} loading="lazy" decoding="async" className="favorite-movie-poster" src={f.poster} alt={f.name}
                                            onClick={() => replaceFavorite(f.index)}></img>
                                    ))}
                                </div>
                            </Box>
                        </Modal>

                        <div className="review-section">
                            <Rating className='star-rating-icon' size='medium' precision={0.5}
                                value={loggedEntry && loggedEntry.rating ? loggedEntry.rating : 0}
                                onChange={(event, value) => rateShow(value)}/>
                            <Box sx={{ width: 800, maxWidth: '100%' }}>
                                <TextField className="textbox" fullWidth multiline minRows={3} variant="standard" label="Write a review" id="review-text"
                                    onChange={(e) => { setReview(e.target.value); setReviewSaved(false); }}/>
                            </Box>
                            {reviewSaved ? <p className="review-saved" role="status">Review saved.</p> : null}
                            <button className="submit-review-button btn-screen" onClick={saveReview}>Save review</button>
                        </div>
                    </div>
                </div>
            </div>

            {seasons.length > 0 ? (
                <section className="show-seasons">
                    <div className="section-head">
                        <h2>Seasons</h2>
                    </div>
                    <ol className="season-list">
                        {seasons.map(season => {
                            const entry = seasonEntry(season.season_number);
                            return (
                                <li key={season.id || season.season_number} className="season-row">
                                    <img loading="lazy" decoding="async" className="season-poster"
                                        src={tmdbImage(season.poster_path || defaultPosterPath, 'w185')} alt=""/>
                                    <div className="season-info">
                                        <h3 className="season-name">{seasonLabel(season)}</h3>
                                        <p className="credit">
                                            {[season.air_date ? formatDate(season.air_date) : 'TBA', season.episode_count ? `${season.episode_count} episode${season.episode_count === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ')}
                                        </p>
                                        {season.overview ? <p className="season-overview">{season.overview}</p> : null}
                                    </div>
                                    <div className="season-actions">
                                        <button className="log-button" onClick={() => toggleSeason(season)} aria-pressed={!!entry}>
                                            {entry ? 'Logged' : 'Log'}
                                        </button>
                                        <Rating size='small' precision={0.5} value={entry && entry.rating ? entry.rating : 0}
                                            aria-label={`Rate ${seasonLabel(season)}`}
                                            onChange={(event, value) => rateSeason(season, value)}/>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </section>
            ) : null}

            <FilmInfoPanel filmId={id} title={show ? show.name : ''} mediaType="tv" />

            <Footer />
        </div>
    );
}

// Each show gets a fresh page (poster list, review draft), so moving from one
// show to another can't carry state across.
export default function ShowPageRoute() {
    const { showId } = useParams();
    return <ShowPage key={showId} />;
}
