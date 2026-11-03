/**
 * Browse-page filters live in the URL path, after the hash (the site uses
 * hash routing so it works on GitHub Pages):
 *   #/<base>[/<special>][/<genre>[/<popularity>[/<decade>]]]
 * e.g. #/films/action, #/films/upcoming/drama, #/tv/all/popularity-asc/1990s
 * <special> is "upcoming" on Films and "airing" on TV. "all" and
 * "popularity-desc" are the defaults and are left off the end.
 */
export function parseBrowsePath(pathname, special) {
    const rest = pathname.split('/').filter(Boolean).slice(1);
    const isSpecial = rest[0] === special;
    if (isSpecial) {
        rest.shift();
    }
    return {
        special: isSpecial,
        genre: rest[0] && rest[0] !== 'all' ? rest[0] : '',
        popularity: rest[1] === 'popularity-asc' ? 'popularity-asc' : 'popularity-desc',
        decade: rest[2] || ''
    };
}

export function buildBrowsePath(base, special, { special: isSpecial, genre, popularity, decade }) {
    const defaults = ['all', 'popularity-desc', ''];
    const tail = [genre || 'all', popularity || 'popularity-desc', isSpecial ? '' : (decade || '')];
    while (tail.length > 0 && tail[tail.length - 1] === defaults[tail.length - 1]) {
        tail.pop();
    }
    return '/' + [base].concat(isSpecial ? [special] : [], tail).join('/');
}
