import './filmswatched.css';

import { app } from '../FirebaseConfig';

import { getFirestore, collection, getDocs } from "firebase/firestore";

import { Link, useParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { tmdbImage, resizeTmdbUrl } from '../util/tmdb';
import { getMovieDetails, forEachLimited } from '../util/movieDetails';
import { memberPosterUrl, fallBackTo } from '../util/posters';

// One star per point, plus a half star; ☰ marks a film logged without a rating.
function ratingStars(rating) {
    if (!(rating > 0)) {
        return '☰';
    }
    return '★'.repeat(Math.floor(rating)) + (rating % 1 !== 0 ? '½' : '');
}

// Newest release first; films without a release date go last.
function sortByRelease(films) {
    return films.slice().sort((a, b) => {
        if (!a.release_date) return 1;
        if (!b.release_date) return -1;
        return b.release_date.localeCompare(a.release_date);
    });
}

/**
 * FilmsWatched component:
 * This component displays the films that a user has logged, newest release first, with the rating
 * the user gave each one. Films appear as their details arrive (fetched a few at a time and cached),
 * so a long diary starts showing straight away and one failed request no longer blanks the page.
 */

function FilmsWatched () {
    // Pair programming: Pride & Amer.
    const { name: user } = useParams();

    const [json, setJSON] = useState({});
    const [films, setFilms] = useState([]);
    const [total, setTotal] = useState(null);
    const [failed, setFailed] = useState(0);

    // Get members JSON to get all the films that the user has logged.
    useEffect(() => {
        const getJSON = async () => {
            const querySnapshot = await getDocs(collection(getFirestore(app), "members"));
            querySnapshot.forEach((doc) => {
                if (doc.data().test === undefined) {
                    setJSON(doc.data());
                }
            });
        }
        getJSON();
    }, []);

    // Fetch each logged film's details and add them to the grid as they arrive.
    useEffect(() => {
        if (json[user] === undefined) {
            return;
        }
        let cancelled = false;

        // One entry per film, even if it was logged more than once.
        const entries = [];
        const seen = new Set();
        for (const film of json[user].films || []) {
            if (!film || film.id === undefined || seen.has(String(film.id))) {
                continue;
            }
            seen.add(String(film.id));
            entries.push(film);
        }
        setFilms([]);
        setFailed(0);
        setTotal(entries.length);

        // Batch arrivals into one state update every ~120 ms.
        let buffer = [];
        let flushTimer = null;
        const flush = () => {
            flushTimer = null;
            if (cancelled || buffer.length === 0) {
                return;
            }
            const arrived = buffer;
            buffer = [];
            setFilms(prev => sortByRelease(prev.concat(arrived)));
        };

        forEachLimited(entries, 8, entry => getMovieDetails(entry.id), (details, entry) => {
            if (cancelled) {
                return;
            }
            if (!details) {
                setFailed(n => n + 1);
                return;
            }
            const year = details.release_date ? details.release_date.split('-')[0] : '';
            const title = details.original_title || details.title || '';
            buffer.push({
                id: details.id,
                title: title,
                release_date: details.release_date,
                page_title: title.replaceAll(' ', '-').toLowerCase() + '-' + year,
                // The member's chosen poster, if any (see util/posters.js).
                poster: memberPosterUrl(json[user], details.id, details.poster_path, 'w500', entry.poster),
                defaultPoster: tmdbImage(details.poster_path),
                rating: entry.rating
            });
            if (flushTimer === null) {
                flushTimer = setTimeout(flush, 120);
            }
        }).then(() => {
            if (flushTimer !== null) {
                clearTimeout(flushTimer);
            }
            flush();
        });

        return () => {
            cancelled = true;
            if (flushTimer !== null) {
                clearTimeout(flushTimer);
            }
        };
    }, [json, user]);

    const pending = total === null ? 0 : Math.max(0, total - films.length - failed);

    return (
        <div className="films-page-container">
            <div className="films-box">
                <div className='title'>
                     <h1 className='page-title'>{`${user}'s logged films`}</h1>
                     {total !== null ? (
                        <p className='films-count credit'>{total === 1 ? '1 film' : `${total} films`}</p>
                     ) : null}
                </div>
                {total === 0 ? (
                    <p className='films-empty credit'>No films logged yet.</p>
                ) : null}
                <div className='films-posters'>
                    <ol className='films-list poster-grid'>
                        {films.map(movie => (
                            <div className="film" key={movie.id}>
                                <div className="film-poster">
                                    <Link to={`/movie/${movie.page_title}`} aria-label={movie.title}>
                                        <img loading='lazy' decoding='async' className='poster-sizing' src={movie.poster} alt='' onError={fallBackTo(movie.defaultPoster)}></img>
                                    </Link>
                                </div>
                                <div className="stars film-rating">
                                    {ratingStars(movie.rating)}
                                </div>
                            </div>
                        ))}
                        {Array.from({ length: pending }, (_, i) => (
                            <div className="film film--loading" key={'pending-' + i} aria-hidden="true">
                                <div className="poster-placeholder"></div>
                            </div>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    )
}
export default FilmsWatched;
