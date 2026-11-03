import "./moviespagestyle.css";

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { tmdbImage } from '../util/tmdb';
import { parseBrowsePath, buildBrowsePath } from '../util/browsePath';
import { TV_GENRES, TV_DECADES, tmdbOptions, showPath, yearOf } from '../util/tv';

const PAGE_SIZE = 30;
const INITIAL_PAGES = 3;
const PAGE_BATCH = 3;

// YYYY-MM-DD in the visitor's own time zone (not UTC), so "today" is today.
function isoDate(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

/**
 * The TMDB URL for one page of shows matching the filters. Mirrors the Films
 * page: top rated by default, "discover" once a filter is set, and
 * "Airing this week" for shows with an episode in the next seven days.
 */
function pageUrl(page, { special, popularity }, genre, decade) {
    const sort = popularity === 'popularity-asc' ? 'popularity.asc' : 'popularity.desc';
    const base = 'https://api.themoviedb.org/3/discover/tv?include_adult=false&include_null_first_air_dates=false&language=en-US&page=' + page + '&sort_by=' + sort;
    const withGenre = genre ? '&with_genres=' + genre.id : '';
    if (special) {
        const today = new Date();
        const week = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        return base + withGenre + '&air_date.gte=' + isoDate(today) + '&air_date.lte=' + isoDate(week);
    }
    if (decade) {
        const start = parseInt(decade, 10);
        return base + withGenre + '&first_air_date.gte=' + start + '-01-01&first_air_date.lte=' + (start + 9) + '-12-31';
    }
    if (genre || popularity === 'popularity-asc') {
        return base + withGenre;
    }
    return 'https://api.themoviedb.org/3/tv/top_rated?language=en-US&page=' + page;
}

/**
 * TVPage component:
 * The TV counterpart of the Films page: a poster wall of shows with search,
 * genre, popularity and decade filters (kept in the URL, e.g. #/tv/drama),
 * an "Airing this week" view, and "Load more".
 */
function TVPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const filters = parseBrowsePath(location.pathname, 'airing');
    const genre = TV_GENRES.find(g => g.name === filters.genre) || null;
    const decade = TV_DECADES.includes(filters.decade) ? filters.decade : '';

    const [results, setResults] = useState([]);
    const [pagesLoaded, setPagesLoaded] = useState(0);
    const [loadingPages, setLoadingPages] = useState(false);
    const [totalPages, setTotalPages] = useState(Infinity);
    const [shown, setShown] = useState(PAGE_SIZE);
    const [searchResults, setSearchResults] = useState(null);
    const searchTimer = useRef(null);

    const changeFilter = (change) => {
        navigate(buildBrowsePath('tv', 'airing', { ...filters, ...change }));
    };

    const fetchPages = (from, to) => {
        setLoadingPages(true);
        const requests = [];
        for (let i = from; i <= to; i++) {
            requests.push(fetch(pageUrl(i, filters, genre, decade), tmdbOptions)
                .then(res => res.json())
                .then(json => {
                    if (json.total_pages !== undefined) {
                        setTotalPages(json.total_pages);
                    }
                    return json.results || [];
                })
                .catch(() => []));
        }
        return Promise.all(requests).then(pages => {
            const fetched = pages.flat().map(show => ({
                id: show.id,
                name: show.name,
                year: yearOf(show.first_air_date),
                poster: tmdbImage(show.poster_path)
            }));
            setResults(prev => {
                const seen = new Set(prev.map(s => s.id));
                return prev.concat(fetched.filter(s => !seen.has(s.id)));
            });
            setPagesLoaded(to);
            setLoadingPages(false);
        });
    };

    useEffect(() => {
        fetchPages(1, INITIAL_PAGES);
        return () => clearTimeout(searchTimer.current);
    }, []);

    const search = (value) => {
        const query = value.trim();
        if (query === '') {
            setSearchResults(null);
            return;
        }
        fetch('https://api.themoviedb.org/3/search/tv?query=' + encodeURIComponent(query) + '&include_adult=false&language=en-US&page=1', tmdbOptions)
            .then(res => res.json())
            .then(json => setSearchResults((json.results || []).slice(0, 4)))
            .catch(() => setSearchResults([]));
    };

    const loadMore = () => {
        const next = shown + PAGE_SIZE;
        setShown(next);
        if (!loadingPages && pagesLoaded < totalPages && results.length < next + PAGE_SIZE) {
            fetchPages(pagesLoaded + 1, Math.min(pagesLoaded + PAGE_BATCH, totalPages, 500));
        }
    };

    return (
        <div className="movies-page-container">
            <div className="movies-box">
                <div className="content-nav">
                    <h1 className="page-title">{filters.special ? 'Airing this week' : 'TV'}</h1>

                    <div className="filters">
                        <div className="search-box">
                            <input type="search" aria-label="Search TV shows" placeholder="Search TV shows" onChange={(e) => {
                                const value = e.target.value;
                                clearTimeout(searchTimer.current);
                                searchTimer.current = setTimeout(() => search(value), 250);
                            }}/><span></span>
                        </div>
                        {searchResults !== null ? (
                            <div className="queried-container">
                                <div className="queried-box">
                                    <ol>
                                        {searchResults.length === 0 ? (
                                            <li className="queried-result"><p className="queried-result-title">No shows found.</p></li>
                                        ) : searchResults.map(show => (
                                            <Link key={show.id} to={showPath(show.id, show.name)}>
                                                <div className="queried-result">
                                                    <img loading="lazy" decoding="async" className="queried-result-img" src={tmdbImage(show.poster_path, 'w185')} alt=""/>
                                                    <p className="queried-result-title">{show.name}{show.first_air_date ? ` (${yearOf(show.first_air_date)})` : ''}</p>
                                                </div>
                                            </Link>
                                        ))}
                                    </ol>
                                </div>
                            </div>
                        ) : null}

                        <label className="genre-order">
                            <span>Showing</span>
                            <select className="genre-dropdown" value={filters.special ? 'airing' : 'all'} onChange={(e) => changeFilter({ special: e.target.value === 'airing' })}>
                                <option value="all">All shows</option>
                                <option value="airing">Airing this week</option>
                            </select>
                        </label>
                        <label className="genre-order">
                            <span>Genre</span>
                            <select className="genre-dropdown" value={genre ? genre.name : ''} onChange={(e) => changeFilter({ genre: e.target.value })}>
                                <option value="">All</option>
                                {TV_GENRES.map(g => <option key={g.name} value={g.name}>{g.label}</option>)}
                            </select>
                        </label>
                        <label className="popularity-order">
                            <span>Popularity</span>
                            <select className="popularity-dropdown" value={filters.popularity} onChange={(e) => changeFilter({ popularity: e.target.value })}>
                                <option value="popularity-desc">Highest to Lowest</option>
                                <option value="popularity-asc">Lowest to Highest</option>
                            </select>
                        </label>
                        {!filters.special ? (
                            <label className="decade-order">
                                <span>Decade</span>
                                <select className="decade-dropdown" value={decade} onChange={(e) => changeFilter({ decade: e.target.value })}>
                                    <option value="">All</option>
                                    {TV_DECADES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </label>
                        ) : null}
                    </div>
                </div>

                {results.length === 0 && !loadingPages && pagesLoaded > 0 ? (
                    <p className="credit">No shows match these filters.</p>
                ) : null}

                <div className="movieposters">
                    <ol className="poster-grid">
                        {results.slice(0, shown).map(show => (
                            <Link key={show.id} to={showPath(show.id, show.name)}>
                                <img loading='lazy' decoding='async' className='poster-sizing' src={show.poster} alt=''></img>
                                <span className='poster-caption'>{show.name}<span className='poster-year'>{show.year}</span></span>
                            </Link>
                        ))}
                    </ol>
                </div>
                {results.length > 0 && (shown < results.length || pagesLoaded < totalPages) ? (
                    <div className="expand-button">
                        <button onClick={loadMore} className="expand btn-ghost">Load more</button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// Changing a filter changes the URL path; remount so the page loads the matching shows.
export default function TVPageRoute() {
    const location = useLocation();
    return <TVPage key={location.pathname} />;
}
