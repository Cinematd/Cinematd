import './watchlist.css';

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { tmdbImage } from '../util/tmdb';
import { getShowDetails, forEachLimited } from '../util/movieDetails';
import { memberPosterUrl, fallBackTo } from '../util/posters';
import { ensureTvLists, useMembers } from '../util/members';
import { showPath } from '../util/tv';

/**
 * TVWatchlist component:
 * The shows a member has saved to watch, in the order they were added.
 */
export default function TVWatchlist() {
    const { name: user } = useParams();
    const [json] = useMembers();
    const [shows, setShows] = useState(null);

    useEffect(() => {
        if (!json) {
            return;
        }
        if (json[user] === undefined) {
            setShows([]);
            return;
        }
        const member = ensureTvLists(json[user]);
        const ids = [...new Set(member.tvWatchlist.filter(Boolean).map(e => String(e.id)))];
        const found = new Array(ids.length).fill(null);
        let cancelled = false;
        forEachLimited(ids.map((id, index) => ({ id, index })), 8, item => getShowDetails(item.id), (details, item) => {
            if (!cancelled && details) {
                found[item.index] = {
                    id: details.id,
                    name: details.name,
                    poster: memberPosterUrl(member, details.id, details.poster_path, 'w500', undefined, 'tv'),
                    defaultPoster: tmdbImage(details.poster_path)
                };
                setShows(found.filter(Boolean));
            }
        }).then(() => {
            if (!cancelled) {
                setShows(found.filter(Boolean));
            }
        });
        return () => { cancelled = true; };
    }, [json, user]);

    return (
        <div className="watchlist-page-container">
            <div className="watchlist-box">
                <div className='title'>
                    <h1 className='page-title'>{`${user}'s TV watchlist`}</h1>
                </div>
                {shows !== null && shows.length === 0 ? <p className='credit'>No shows on this watchlist yet.</p> : null}
                <div className='watchlist-posters'>
                    <ol className='poster-grid'>
                        {(shows || []).map(show => (
                            <Link key={show.id} to={showPath(show.id, show.name)} aria-label={show.name}>
                                <img loading='lazy' decoding='async' className='poster-sizing' src={show.poster} alt='' onError={fallBackTo(show.defaultPoster)}></img>
                            </Link>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}
