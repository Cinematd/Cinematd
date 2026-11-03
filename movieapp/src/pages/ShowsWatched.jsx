import './filmswatched.css';

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tmdbImage } from '../util/tmdb';
import { getShowDetails, forEachLimited } from '../util/movieDetails';
import { memberPosterUrl, fallBackTo } from '../util/posters';
import { ensureTvLists, useMembers } from '../util/members';
import { showPath } from '../util/tv';

function ratingStars(rating) {
    if (!(rating > 0)) {
        return '';
    }
    return '★'.repeat(Math.floor(rating)) + (rating % 1 !== 0 ? '½' : '');
}

function sortByFirstAired(shows) {
    return shows.slice().sort((a, b) => {
        if (!a.first_air_date) return 1;
        if (!b.first_air_date) return -1;
        return b.first_air_date.localeCompare(a.first_air_date);
    });
}

/**
 * ShowsWatched component:
 * The TV counterpart of Logged films: every show a member has logged, or
 * logged seasons of, newest first, with their rating for the show and for
 * each season. Shows appear as their details arrive (fetched a few at a time
 * and cached), so long lists start showing straight away.
 */
export default function ShowsWatched() {
    const { name: user } = useParams();
    const [json] = useMembers();
    const [shows, setShows] = useState([]);
    const [total, setTotal] = useState(null);
    const [failed, setFailed] = useState(0);

    useEffect(() => {
        if (!json) {
            return;
        }
        if (json[user] === undefined) {
            setShows([]);
            setTotal(0);
            return;
        }
        const member = ensureTvLists(json[user]);
        let cancelled = false;

        // One entry per show: logged as a whole and/or by season.
        const byId = new Map();
        const entryFor = (showId) => {
            const key = String(showId);
            if (!byId.has(key)) {
                byId.set(key, { id: showId, logged: false, rating: 0, seasons: [] });
            }
            return byId.get(key);
        };
        for (const entry of member.shows) {
            if (entry && entry.id !== undefined) {
                const e = entryFor(entry.id);
                e.logged = true;
                e.rating = entry.rating || e.rating;
            }
        }
        for (const s of member.seasons) {
            if (s && s.showId !== undefined && !entryFor(s.showId).seasons.some(x => x.season === s.season)) {
                entryFor(s.showId).seasons.push({ season: s.season, rating: s.rating });
            }
        }
        const entries = [...byId.values()];
        entries.forEach(e => e.seasons.sort((a, b) => a.season - b.season));

        setShows([]);
        setFailed(0);
        setTotal(entries.length);

        let buffer = [];
        let flushTimer = null;
        const flush = () => {
            flushTimer = null;
            if (cancelled || buffer.length === 0) {
                return;
            }
            const arrived = buffer;
            buffer = [];
            setShows(prev => sortByFirstAired(prev.concat(arrived)));
        };

        forEachLimited(entries, 8, entry => getShowDetails(entry.id), (details, entry) => {
            if (cancelled) {
                return;
            }
            if (!details) {
                setFailed(n => n + 1);
                return;
            }
            buffer.push({
                ...entry,
                name: details.name,
                first_air_date: details.first_air_date,
                poster: memberPosterUrl(member, details.id, details.poster_path, 'w500', undefined, 'tv'),
                defaultPoster: tmdbImage(details.poster_path)
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

    const pending = total === null ? 0 : Math.max(0, total - shows.length - failed);

    return (
        <div className="films-page-container">
            <div className="films-box">
                <div className='title'>
                    <h1 className='page-title'>{`${user}'s logged shows`}</h1>
                    {total !== null ? <p className='films-count credit'>{total === 1 ? '1 show' : `${total} shows`}</p> : null}
                </div>
                {total === 0 ? <p className='films-empty credit'>No shows logged yet.</p> : null}
                <div className='films-posters'>
                    <ol className='films-list poster-grid'>
                        {shows.map(show => (
                            <div className="film" key={show.id}>
                                <div className="film-poster">
                                    <Link to={showPath(show.id, show.name)} aria-label={show.name}>
                                        <img loading='lazy' decoding='async' className='poster-sizing' src={show.poster} alt='' onError={fallBackTo(show.defaultPoster)}></img>
                                    </Link>
                                </div>
                                <div className="stars film-rating">
                                    {show.logged ? (ratingStars(show.rating) || '☰') : null}
                                </div>
                                {show.seasons.length > 0 ? (
                                    <p className="show-season-ratings">
                                        {show.seasons.map(s => (s.season === 0 ? 'Specials' : 'S' + s.season) + (s.rating > 0 ? ' ' + ratingStars(s.rating) : '')).join(', ')}
                                    </p>
                                ) : null}
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
    );
}
