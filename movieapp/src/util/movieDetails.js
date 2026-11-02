/**
 * Film details from TMDB, cached and fetched a few at a time.
 *
 * Pages like Logged films need details for hundreds of films. Firing every
 * request at once is slow and gets rate-limited, and one failure used to
 * stop the whole page from rendering. These helpers cache results (in
 * memory and in sessionStorage, so revisits are instant), never reject,
 * and limit how many requests run at the same time.
 */

const options = {
    method: 'GET',
    headers: {
        accept: 'application/json',
        Authorization: import.meta.env.VITE_TMDB_AUTH
    }
};

const memory = new Map();
const STORAGE_PREFIX = 'tmdb-movie-';

function readStored(id) {
    try {
        const raw = sessionStorage.getItem(STORAGE_PREFIX + id);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function writeStored(id, details) {
    try {
        sessionStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(details));
    } catch (e) {
        // Storage full or unavailable: the in-memory cache still works.
    }
}

/**
 * Resolves to { id, title, original_title, release_date, poster_path,
 * backdrop_path } for a TMDB film id, or null if it can't be found.
 * Never rejects.
 */
export function getMovieDetails(id) {
    const key = String(id);
    if (memory.has(key)) {
        return memory.get(key);
    }
    const stored = readStored(key);
    if (stored) {
        const resolved = Promise.resolve(stored);
        memory.set(key, resolved);
        return resolved;
    }
    const request = fetch('https://api.themoviedb.org/3/movie/' + key + '?language=en-US', options)
        .then(res => (res.ok ? res.json() : null))
        .then(json => {
            if (!json || json.id === undefined) {
                memory.delete(key);
                return null;
            }
            const details = {
                id: json.id,
                title: json.title,
                original_title: json.original_title,
                release_date: json.release_date || '',
                poster_path: json.poster_path,
                backdrop_path: json.backdrop_path
            };
            writeStored(key, details);
            return details;
        })
        .catch(() => {
            // Allow a retry next time.
            memory.delete(key);
            return null;
        });
    memory.set(key, request);
    return request;
}

/**
 * Runs fn over items with at most `limit` in flight, calling onResult(result,
 * item) as each one finishes. Resolves when all are done.
 */
export async function forEachLimited(items, limit, fn, onResult) {
    let next = 0;
    const worker = async () => {
        while (next < items.length) {
            const item = items[next++];
            const result = await fn(item);
            if (onResult) {
                onResult(result, item);
            }
        }
    };
    const workers = [];
    for (let i = 0; i < Math.min(limit, items.length); i++) {
        workers.push(worker());
    }
    await Promise.all(workers);
}

/** Lower-cased, trimmed title for comparing films by name. */
export function normaliseTitle(title) {
    return typeof title === 'string' ? title.trim().toLowerCase() : '';
}
