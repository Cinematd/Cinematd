/**
 * TMDB image helpers.
 *
 * TMDB serves every image in several sizes. "original" posters are often
 * 2000x3000 pixels and several megabytes each, far bigger than the posters
 * are ever shown on the site, so we ask for a size that fits instead.
 * Sizes: posters w92 / w185 / w342 / w500 / w780, backdrops w780 / w1280.
 */

const BASE = 'https://image.tmdb.org/t/p/';

export function tmdbImage(path, size = 'w500') {
    return path ? BASE + size + path : '';
}

/**
 * Re-sizes a TMDB image URL that was saved earlier (for example a poster
 * stored with a review) so old "original" URLs load at a sensible size.
 * Other URLs are returned unchanged.
 */
export function resizeTmdbUrl(url, size = 'w500') {
    if (typeof url !== 'string') {
        return url;
    }
    return url.replace(/\/t\/p\/original\//, '/t/p/' + size + '/');
}
