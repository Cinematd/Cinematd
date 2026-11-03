import { tmdbImage, resizeTmdbUrl } from './tmdb';

/**
 * Member-chosen posters.
 *
 * A logged-in member can pick any of a film's or show's current TMDB posters
 * on its page. Choices are stored on the member's record as
 *   json[username].posters = { "<tmdb film id>": "/path.jpg", "tv:<tmdb show id>": "/path.jpg" }
 * (TV ids are prefixed because TMDB film and show ids can be the same number)
 * (the TMDB file path, so any size can be requested). They are shown on that
 * member's Profile, Logged films and Watchlist pages, to every visitor; the
 * rest of the site keeps TMDB's default poster.
 */

/** Key a choice is stored under: the film id, or "tv:<id>" for a show. */
export function posterKey(id, mediaType = 'movie') {
    return mediaType === 'tv' ? 'tv:' + id : String(id);
}

/** The member's chosen poster path for a film (or show), or null. */
export function customPosterPath(member, filmId, mediaType = 'movie') {
    if (!member || !member.posters || filmId === undefined || filmId === null) {
        return null;
    }
    return member.posters[posterKey(filmId, mediaType)] || null;
}

/**
 * The poster URL to show for a film on a member's own pages: their chosen
 * poster if they picked one, else a poster saved on the entry by older
 * versions of the site, else TMDB's default.
 */
export function memberPosterUrl(member, filmId, defaultPath, size = 'w500', legacyUrl, mediaType = 'movie') {
    const custom = customPosterPath(member, filmId, mediaType);
    if (custom) {
        return tmdbImage(custom, size);
    }
    if (legacyUrl) {
        return resizeTmdbUrl(legacyUrl, size);
    }
    return tmdbImage(defaultPath, size);
}

/**
 * onError handler for a poster <img>: if a chosen poster can no longer be
 * loaded (for example TMDB removed it), show the default poster instead.
 */
export function fallBackTo(defaultUrl) {
    return (event) => {
        const img = event.currentTarget;
        if (defaultUrl && img.src !== defaultUrl) {
            img.src = defaultUrl;
        }
    };
}
