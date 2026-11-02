// TODO: CACHE WORK IN PROGRESS

const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: '' + auth
    }
};

export default class MovieCache {
    constructor() { }

    static populate() {
        if (Object.keys(localStorage).length > 0) {
            return undefined;
        }
        for (let i = 1; i < 110; i++) {
            fetch('https://api.themoviedb.org/3/movie/popular?language=en-US&page=' + i, options)
                .then(res => res.json())
                .then(json => {
                    const results = json.results;

                    for (let j = 0; j < results.length; j++) {
                        const result = results[j];

                        if (result == null) {
                            break;
                        }
                        const releaseDate = result.release_date.split('-');

                        const lowercase = result.title.replaceAll(' ', '-').toLowerCase() + '-' + releaseDate[0];
                    
                        const map = {
                          id: result.id,
                          title: result.title,
                          page_title: lowercase,
                          description: result.overview,
                          release: result.release_date,
                          poster: 'https://image.tmdb.org/t/p/original' + result.poster_path,
                          backdrop: 'https://image.tmdb.org/t/p/w1280' + result.backdrop_path,
                          popularity: result.popularity
                        };
                        localStorage.setItem(map.id, JSON.stringify(map));
                    }
                })
                .catch(err => console.log(err));
        }
        return undefined;
    }
}