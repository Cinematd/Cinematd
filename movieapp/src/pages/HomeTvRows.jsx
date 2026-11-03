import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { tmdbImage } from '../util/tmdb';
import { tmdbOptions, showPath, yearOf } from '../util/tv';

// Five shows from a TMDB list endpoint.
function useShowRow(url) {
    const [shows, setShows] = useState([]);
    useEffect(() => {
        let cancelled = false;
        fetch(url, tmdbOptions)
            .then(res => res.json())
            .then(json => {
                if (!cancelled) {
                    setShows((json.results || []).filter(s => s.poster_path).slice(0, 5));
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [url]);
    return shows;
}

function ShowRow({ title, linkTo, linkLabel, shows }) {
    return (
        <section className="home-section">
            <div className="section-head">
                <h2>{title}</h2>
                <Link className='section-link' to={linkTo}>{linkLabel}</Link>
            </div>
            <ol className="poster-row">
                {shows.map(show => (
                    <li key={show.id}>
                        <Link to={showPath(show.id, show.name)}>
                            <img loading='lazy' decoding='async' className='MovieImage-size' src={tmdbImage(show.poster_path)} alt='' />
                            <span className="poster-caption">
                                {show.name}
                                <span className="poster-year">{yearOf(show.first_air_date)}</span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ol>
        </section>
    );
}

/**
 * HomeTvRows component:
 * The home page's TV rows: shows airing this week and shows trending this week.
 */
export default function HomeTvRows() {
    const airing = useShowRow('https://api.themoviedb.org/3/tv/on_the_air?language=en-US&page=1');
    const trending = useShowRow('https://api.themoviedb.org/3/trending/tv/week?language=en-US');

    return (
        <>
            <ShowRow title="Airing this week" linkTo="/tv/airing" linkLabel="See all airing" shows={airing} />
            <ShowRow title="Trending shows" linkTo="/tv" linkLabel="Browse all TV" shows={trending} />
        </>
    );
}
