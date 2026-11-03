/**
 * TV helpers shared by the TV browse page, show pages and members' TV lists.
 */

// TMDB's TV genres (they differ from film genres), with URL-friendly names.
export const TV_GENRES = [
    { name: 'action-adventure', label: 'Action & Adventure', id: 10759 },
    { name: 'animation', label: 'Animation', id: 16 },
    { name: 'comedy', label: 'Comedy', id: 35 },
    { name: 'crime', label: 'Crime', id: 80 },
    { name: 'documentary', label: 'Documentary', id: 99 },
    { name: 'drama', label: 'Drama', id: 18 },
    { name: 'family', label: 'Family', id: 10751 },
    { name: 'kids', label: 'Kids', id: 10762 },
    { name: 'mystery', label: 'Mystery', id: 9648 },
    { name: 'news', label: 'News', id: 10763 },
    { name: 'reality', label: 'Reality', id: 10764 },
    { name: 'sci-fi-fantasy', label: 'Sci-Fi & Fantasy', id: 10765 },
    { name: 'soap', label: 'Soap', id: 10766 },
    { name: 'talk', label: 'Talk', id: 10767 },
    { name: 'war-politics', label: 'War & Politics', id: 10768 },
    { name: 'western', label: 'Western', id: 37 },
];

export const TV_DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s', '1960s', '1950s'];

export const tmdbOptions = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: import.meta.env.VITE_TMDB_AUTH
    }
};

export function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Show pages are addressed by TMDB id (with the name for readability). */
export function showPath(id, name) {
    const slug = slugify(name);
    return slug ? `/show/${id}/${slug}` : `/show/${id}`;
}

export function yearOf(date) {
    return date ? String(date).slice(0, 4) : '';
}

/** "2019–2023", "2021–" (still running) or "2024". */
export function airYears(show) {
    const first = yearOf(show.first_air_date);
    const last = yearOf(show.last_air_date);
    if (!first) {
        return '';
    }
    if (show.in_production || show.status === 'Returning Series') {
        return first + '–';
    }
    return last && last !== first ? `${first}–${last}` : first;
}

/** Label for a season: "Specials" for season 0, else its name or "Season N". */
export function seasonLabel(season) {
    if (season.season_number === 0) {
        return 'Specials';
    }
    return season.name || `Season ${season.season_number}`;
}
