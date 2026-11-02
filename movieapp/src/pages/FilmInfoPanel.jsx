import './filminfopanel.css';

import React, { useEffect, useRef, useState } from 'react';
import { tmdbImage } from '../util/tmdb';
import { defaultAvatar } from '../util/avatar';

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: import.meta.env.VITE_TMDB_AUTH
    }
};

// Crew departments in the order a film's credits usually run.
const DEPARTMENT_ORDER = ['Directing', 'Writing', 'Production', 'Camera', 'Editing', 'Sound', 'Art', 'Costume & Make-Up', 'Visual Effects', 'Lighting', 'Crew'];
const CAST_PREVIEW = 20;

function formatRuntime(minutes) {
    if (!minutes) {
        return null;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(iso) {
    if (!iso) {
        return null;
    }
    const date = new Date(iso + 'T00:00:00');
    return isNaN(date) ? iso : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatMoney(amount) {
    return amount > 0 ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) : null;
}

// Groups crew by department, one row per person with all of their jobs.
function groupCrew(crew) {
    const departments = new Map();
    for (const member of crew || []) {
        const dept = member.department || 'Crew';
        if (!departments.has(dept)) {
            departments.set(dept, new Map());
        }
        const people = departments.get(dept);
        if (people.has(member.id)) {
            const person = people.get(member.id);
            if (!person.jobs.includes(member.job)) {
                person.jobs.push(member.job);
            }
        } else {
            people.set(member.id, { id: member.id, name: member.name, jobs: [member.job] });
        }
    }
    return [...departments.entries()]
        .sort(([a], [b]) => {
            const ia = DEPARTMENT_ORDER.indexOf(a), ib = DEPARTMENT_ORDER.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        })
        .map(([name, people]) => ({ name, people: [...people.values()] }));
}

// US certification (PG-13, R, ...) from release_dates, if TMDB has one.
function usCertification(details) {
    const results = details && details.release_dates ? details.release_dates.results : [];
    const us = (results || []).find(r => r.iso_3166_1 === 'US');
    const rated = us ? us.release_dates.find(d => d.certification) : null;
    return rated ? rated.certification : null;
}

/**
 * FilmInfoPanel component:
 * A drawer on the right of the Movie page with the film's cast, crew and
 * details. On desktop it slides in when the cursor reaches the right edge of
 * the screen (or from the "Cast & crew" tab, which also works by keyboard)
 * and slides away when the cursor leaves it, unless it was opened by click.
 * On phones it opens from a menu button. Escape, the close button or a tap
 * outside closes it.
 */
export default function FilmInfoPanel({ filmId, title }) {
    const [open, setOpen] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [tab, setTab] = useState('cast');
    const [credits, setCredits] = useState(null);
    const [details, setDetails] = useState(null);
    const [failed, setFailed] = useState(false);
    const [showAllCast, setShowAllCast] = useState(false);

    const panelRef = useRef(null);
    const headingRef = useRef(null);
    const openTimer = useRef(null);
    const closeTimer = useRef(null);
    const canHover = useRef(
        typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches
    );

    // Fetch credits and details once per film.
    useEffect(() => {
        if (!filmId) {
            return;
        }
        let cancelled = false;
        setCredits(null);
        setDetails(null);
        setFailed(false);
        Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/${filmId}/credits?language=en-US`, options).then(res => (res.ok ? res.json() : Promise.reject(res.status))),
            fetch(`https://api.themoviedb.org/3/movie/${filmId}?language=en-US&append_to_response=release_dates`, options).then(res => (res.ok ? res.json() : Promise.reject(res.status)))
        ]).then(([creditsJson, detailsJson]) => {
            if (!cancelled) {
                setCredits(creditsJson);
                setDetails(detailsJson);
            }
        }).catch(() => {
            if (!cancelled) {
                setFailed(true);
            }
        });
        return () => { cancelled = true; };
    }, [filmId]);

    // Escape closes the drawer.
    useEffect(() => {
        if (!open) {
            return;
        }
        const onKey = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    useEffect(() => () => {
        clearTimeout(openTimer.current);
        clearTimeout(closeTimer.current);
    }, []);

    const openPinned = () => {
        clearTimeout(closeTimer.current);
        setPinned(true);
        setOpen(true);
        // Move focus into the drawer so keyboard and screen reader users land there.
        setTimeout(() => headingRef.current && headingRef.current.focus(), 50);
    };

    const close = () => {
        clearTimeout(openTimer.current);
        clearTimeout(closeTimer.current);
        setOpen(false);
        setPinned(false);
    };

    // Desktop: a short pause at the right edge opens it, so passing the
    // cursor over the edge (e.g. to the scrollbar) doesn't.
    const onEdgeEnter = () => {
        if (!canHover.current || open) {
            return;
        }
        clearTimeout(openTimer.current);
        openTimer.current = setTimeout(() => setOpen(true), 150);
    };

    const onEdgeLeave = () => clearTimeout(openTimer.current);

    const onPanelEnter = () => clearTimeout(closeTimer.current);

    const onPanelLeave = () => {
        if (!canHover.current || pinned) {
            return;
        }
        clearTimeout(closeTimer.current);
        closeTimer.current = setTimeout(() => setOpen(false), 300);
    };

    if (!filmId) {
        return null;
    }

    const cast = credits ? [...(credits.cast || [])].sort((a, b) => a.order - b.order) : [];
    const shownCast = showAllCast ? cast : cast.slice(0, CAST_PREVIEW);
    const crew = credits ? groupCrew(credits.crew) : [];

    const detailRows = details ? [
        ['Runtime', formatRuntime(details.runtime)],
        ['Released', formatDate(details.release_date)],
        ['Rated', usCertification(details)],
        ['Genres', (details.genres || []).map(g => g.name).join(', ')],
        ['Original title', details.original_title !== details.title ? details.original_title : null],
        ['Language', (details.spoken_languages || []).map(l => l.english_name || l.name).join(', ')],
        ['Country', (details.production_countries || []).map(c => c.name).join(', ')],
        ['Studios', (details.production_companies || []).map(c => c.name).join(', ')],
        ['Budget', formatMoney(details.budget)],
        ['Box office', formatMoney(details.revenue)],
        ['Status', details.status],
    ].filter(([, value]) => value) : [];

    const tabs = [['cast', 'Cast'], ['crew', 'Crew'], ['details', 'Details']];

    return (
        <>
            {/* Desktop: an invisible strip along the right edge, and a visible tab. */}
            <div className="film-info-edge" onMouseEnter={onEdgeEnter} onMouseLeave={onEdgeLeave} aria-hidden="true"></div>
            <button
                type="button"
                className={'film-info-tab' + (open ? ' is-hidden' : '')}
                onClick={openPinned}
                onMouseEnter={onEdgeEnter}
                onMouseLeave={onEdgeLeave}
                aria-controls="film-info-panel"
                aria-expanded={open}>
                Cast &amp; crew
            </button>

            {/* Phones: a menu button. */}
            <button
                type="button"
                className={'film-info-menu' + (open ? ' is-hidden' : '')}
                onClick={openPinned}
                aria-controls="film-info-panel"
                aria-expanded={open}
                aria-label="Show cast, crew and details">
                <span></span><span></span><span></span>
            </button>

            <div className={'film-info-backdrop' + (open ? ' is-open' : '')} onClick={close} aria-hidden="true"></div>

            <aside
                id="film-info-panel"
                ref={panelRef}
                className={'film-info-panel' + (open ? ' is-open' : '')}
                aria-label="Cast, crew and details"
                aria-hidden={!open}
                inert={open ? undefined : ''}
                onMouseEnter={onPanelEnter}
                onMouseLeave={onPanelLeave}>
                <header className="film-info-header">
                    <h2 className="film-info-title" tabIndex={-1} ref={headingRef}>{title || 'This film'}</h2>
                    <button type="button" className="film-info-close" onClick={close} aria-label="Close">
                        <span aria-hidden="true">×</span>
                    </button>
                </header>

                <div className="film-info-tabs" role="tablist" aria-label="Film information">
                    {tabs.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            id={'film-info-tab-' + key}
                            aria-selected={tab === key}
                            aria-controls={'film-info-section-' + key}
                            className={'film-info-tabbutton' + (tab === key ? ' is-active' : '')}
                            onClick={() => setTab(key)}>
                            {label}
                        </button>
                    ))}
                </div>

                <div className="film-info-body">
                    {failed ? (
                        <p className="film-info-empty">Cast and crew couldn't be loaded. Check your connection and reopen the page.</p>
                    ) : !credits || !details ? (
                        <p className="film-info-empty">Loading…</p>
                    ) : null}

                    {credits && details && tab === 'cast' ? (
                        <section id="film-info-section-cast" role="tabpanel" aria-labelledby="film-info-tab-cast">
                            {cast.length === 0 ? <p className="film-info-empty">TMDB doesn't list a cast for this film yet.</p> : null}
                            <ol className="film-info-cast">
                                {shownCast.map(person => (
                                    <li key={person.credit_id} className="film-info-person">
                                        <img
                                            loading="lazy"
                                            decoding="async"
                                            src={person.profile_path ? tmdbImage(person.profile_path, 'w185') : defaultAvatar}
                                            alt=""
                                            onError={(e) => { if (e.currentTarget.src !== defaultAvatar) e.currentTarget.src = defaultAvatar; }}
                                        />
                                        <div>
                                            <p className="film-info-name">{person.name}</p>
                                            {person.character ? <p className="film-info-role">{person.character}</p> : null}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            {cast.length > CAST_PREVIEW ? (
                                <button type="button" className="btn-ghost film-info-more" onClick={() => setShowAllCast(!showAllCast)}>
                                    {showAllCast ? 'Show fewer' : `Show all ${cast.length}`}
                                </button>
                            ) : null}
                        </section>
                    ) : null}

                    {credits && details && tab === 'crew' ? (
                        <section id="film-info-section-crew" role="tabpanel" aria-labelledby="film-info-tab-crew">
                            {crew.length === 0 ? <p className="film-info-empty">TMDB doesn't list a crew for this film yet.</p> : null}
                            {crew.map(dept => (
                                <div key={dept.name} className="film-info-dept">
                                    <h3 className="film-info-dept-name">{dept.name}</h3>
                                    <dl className="film-info-rows">
                                        {dept.people.map(person => (
                                            <div key={person.id} className="film-info-row">
                                                <dt>{person.jobs.join(', ')}</dt>
                                                <dd>{person.name}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                            ))}
                        </section>
                    ) : null}

                    {credits && details && tab === 'details' ? (
                        <section id="film-info-section-details" role="tabpanel" aria-labelledby="film-info-tab-details">
                            {details.tagline ? <p className="film-info-tagline">{details.tagline}</p> : null}
                            <dl className="film-info-rows">
                                {detailRows.map(([label, value]) => (
                                    <div key={label} className="film-info-row">
                                        <dt>{label}</dt>
                                        <dd>{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ) : null}
                </div>
            </aside>
        </>
    );
}
