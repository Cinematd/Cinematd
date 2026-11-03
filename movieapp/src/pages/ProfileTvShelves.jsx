import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tmdbImage } from '../util/tmdb';
import { getShowDetails } from '../util/movieDetails';
import { memberPosterUrl, fallBackTo } from '../util/posters';
import { ensureTvLists } from '../util/members';
import { showPath } from '../util/tv';

// Loads up to five shows (in order) for a profile shelf.
function useShelf(member, list) {
    const [shows, setShows] = useState([]);
    const ids = member ? (ensureTvLists(member)[list] || []).filter(Boolean).map(e => String(e.id)).slice(0, 5) : [];
    const key = ids.join(',');
    useEffect(() => {
        if (ids.length === 0) {
            setShows([]);
            return;
        }
        let cancelled = false;
        Promise.all(ids.map(id => getShowDetails(id))).then(details => {
            if (!cancelled) {
                setShows(details.filter(Boolean).map(d => ({
                    id: d.id,
                    name: d.name,
                    poster: memberPosterUrl(member, d.id, d.poster_path, 'w500', undefined, 'tv'),
                    defaultPoster: tmdbImage(d.poster_path)
                })));
            }
        });
        return () => { cancelled = true; };
    }, [key, member]);
    return shows;
}

function Shelf({ shows }) {
    return (
        <ol className='poster-row-5'>
            {shows.map(show => (
                <Link key={show.id} to={showPath(show.id, show.name)} aria-label={show.name}>
                    <img loading='lazy' decoding='async' className='poster-sizing' src={show.poster} alt='' onError={fallBackTo(show.defaultPoster)}></img>
                </Link>
            ))}
        </ol>
    );
}

/**
 * ProfileTvShelves component:
 * The TV shelves on a profile: favourite shows and the TV watchlist, shown
 * with the member's chosen posters. Each shelf only appears once it has shows.
 */
export default function ProfileTvShelves({ member, user }) {
    const favorites = useShelf(member, 'favoriteShows');
    const watchlist = useShelf(member, 'tvWatchlist');

    return (
        <>
            {favorites.length > 0 ? (
                <section className='profile-section'>
                    <div className='section-head'>
                        <h3>Favorite shows</h3>
                    </div>
                    <Shelf shows={favorites} />
                </section>
            ) : null}
            {watchlist.length > 0 ? (
                <section className='profile-section'>
                    <div className='section-head'>
                        <h3>TV watchlist</h3>
                        <Link className='section-link' to={`/profile/${user}/watchlist/tv`}>See full TV watchlist</Link>
                    </div>
                    <Shelf shows={watchlist} />
                </section>
            ) : null}
        </>
    );
}
