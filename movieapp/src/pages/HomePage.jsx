import '../App.css';

import MovieQueue from '../util/MovieQueue';

import React, {useState, useEffect, useRef} from 'react';
import { Link } from 'react-router-dom';
import Footer from '../Footer';
import HomeTvRows from './HomeTvRows';
import { tmdbImage, resizeTmdbUrl } from '../util/tmdb';

const upcomingUrl = 'https://api.themoviedb.org/3/movie/upcoming?language=en-US&page=1';

let todaysDate = new Date().toLocaleDateString().split('/');

const day = todaysDate[1];
todaysDate = [parseInt(todaysDate[0]), parseInt(todaysDate[1]), parseInt(todaysDate[2])];

const options = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: import.meta.env.VITE_TMDB_AUTH
  }
};

/**
 * HomePage component:
 * This component handles the home page. It displays the banner, which is a random movie from our Upcoming Movies queries
 * that is coming out soon. It also displays the upcoming movies that are queried to filter by release date of today and 6 months from now, 
 * and trending movies, which are the top 5 trending movies on TMDB.
 * All is done with the TMDB API.
 */

const Home = () => {
  // Pair programming: Pride & Amer.
  const queue = new MovieQueue();

  const [results, setResults] = useState([])
  const [banner, setBanner] = useState('')
  const [title, setTitle] = useState({});
  const [bannerName, setBannerName] = useState('');
  const bannerRequested = useRef(false);

  const [trendingMovies, setTrendingMovies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const trendingUrl = 'https://api.themoviedb.org/3/trending/movie/day?language=en-US';

  const fetchTrendingMovies = async () => {
    try {
      const response = await fetch(trendingUrl, options);
      const data = await response.json();
      setTrendingMovies(data.results.slice(0, 5));
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    }
  };

  useEffect(() => {
    fetchTrendingMovies();
  }, [currentPage]);

  // Fetch the data. Update state.
  useEffect(() => {
    fetch('https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&primary_release_date.gte=' + todaysDate[2] + '-' + todaysDate[0] + '-' + (day.length == 1 ? '0' + day : day) + '&sort_by=popularity.desc', options)
        .then(res => res.json())
        .then(json => setResults(json.results))
        .catch(err => console.log(err))
  }, []);

  // Restructure this data into a literal that we can use later. Put these
  // literals into a queue.
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const releaseDate = result.release_date.split('-');

    const releaseDateMonth = parseInt(releaseDate[1]);
    const releaseDateDay = parseInt(releaseDate[2]);
    const releaseDateYear = parseInt(releaseDate[0]);

    const todaysDateMonth = parseInt(todaysDate[0]);
    const todaysDateDay = parseInt(todaysDate[1]);
    const todaysDateYear = parseInt(todaysDate[2]);

    if ((releaseDateYear === todaysDateYear && releaseDateMonth > todaysDateMonth + 6) || releaseDateYear > todaysDateYear) {
      continue;
    }
    
    const lowercase = result.original_title.replaceAll(' ', '-').toLowerCase() + '-' + releaseDate[0];

    const map = {
      popularity: result.popularity,
      id: result.id,
      title: result.original_title,
      page_title: lowercase,
      description: result.overview,
      release: result.release_date,
      poster: tmdbImage(result.poster_path),
      backdrop: result.backdrop_path
    };
    queue.enqueue(map);
  }
  // queue.sort();

  // Set the banner to a random movie from the queue, once the upcoming
  // films have arrived (not on every render).
  useEffect(() => {
    if (banner === '' && queue.length > 0 && !bannerRequested.current) {
      bannerRequested.current = true;
      const random = Math.floor(Math.random() * queue.length);
      const id = queue.get(random) == null ? 0 : queue.get(random).id;
      const title = queue.get(random) == null ? '' : queue.get(random).page_title;
      const name = queue.get(random) == null ? '' : queue.get(random).title;

      fetch('https://api.themoviedb.org/3/movie/' + id + '/images?include_image_language=null', options)
        .then(res => res.json())
        .then(json => {
          const breakRandom = Math.floor(Math.random() * json.backdrops.length);
          let index = 0;
          for (let i = 0; i < json.backdrops.length; i++) {
            if (i == breakRandom) {
              index = i;
              break;
            }
          }
          setBanner('https://image.tmdb.org/t/p/w1280' + json.backdrops[index].file_path);
          setTitle(title);
          setBannerName(name);
        })
        .catch(err => console.error('error:' + err));
    }
  }, [results]);

  // A single poster in one of the home page rows, captioned with title and year.
  const posterLink = (movie, key) => (
    <li key={key}>
      <Link to={`/movie/${movie == null ? '' : movie.page_title}`}>
        <img loading='lazy' decoding='async' className='MovieImage-size' src={movie == null ? '' : movie.poster} alt=''></img>
        <span className="poster-caption">
          {movie == null ? '' : movie.title}
          <span className="poster-year">{movie == null ? '' : movie.release.split('-')[0]}</span>
        </span>
      </Link>
    </li>
  );

  // Render all this information.
  return (
    <div className="home-container">
      <section className="hero">
        <div className="hero-stage">
          <Link to={`/movie/${title}`} className="hero-frame" aria-label="Open the featured film">
            <div className="the-banner" style={{backgroundImage: "url(" + banner + ")"}}></div>
          </Link>
          {bannerName ? (
            <Link to={`/movie/${title}`} className="now-showing">
              <span className="now-showing-label">Now showing</span>
              <span className="now-showing-title">{bannerName}</span>
            </Link>
          ) : null}
        </div>
        <div className="hero-card">
          <p className="transition-cue" aria-hidden="true">FADE IN:</p>
          <h1 className="primary-heading">Every Movie, Everywhere, All at Once</h1>
          <p className="hero-sub">Keep a diary of every film you watch, build a watchlist, and plan the next night out with friends.</p>
          <Link to="/films" className="btn-screen">Start here</Link>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>Upcoming movies</h2>
          <Link className='section-link' to='/films/upcoming'>See all upcoming</Link>
        </div>
        <ol className="poster-row">
          {[0, 1, 2, 3, 4].map((i) => posterLink(queue.get(i), i))}
        </ol>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>Movie of the day</h2>
        </div>
        <div className="movie-of-the-day-container lobby-card">
          <div className="motd-still" style={{backgroundImage: "url(" + tmdbImage('/7HR38hMBl23lf38MAN63y4pKsHz.jpg', 'w1280') + ")"}}></div>
          <div className='content-motd'>
            <Link to={`/movie/past-lives-2023`} className="motd-poster-link">
              <img className='movie-of-the-day-poster' src={tmdbImage('/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg')} alt='Past Lives poster'></img>
            </Link>
            <div className="motd-text">
              <h3 className="movie-of-the-day-title">Past Lives</h3>
              <p className="credit">Directed by Celine Song</p>
              <p className="movie-of-the-day-description">Nora and Hae Sung, two childhood friends, are reunited in New York for one fateful week as they confront notions of destiny, love, and the choices that make a life.</p>
              <Link to={`/movie/past-lives-2023`} className="btn-ghost">View film</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="section-head">
          <h2>Trending movies</h2>
          <Link className='section-link' to='/films'>Browse all films</Link>
        </div>
        <ol className="poster-row">
          {trendingMovies.map((movie) => (
            <li key={movie.id}>
              <Link to={`/movie/${movie.original_title.replaceAll(' ', '-').toLowerCase() + '-' + movie.release_date.split('-')[0]}`}>
                <img loading='lazy' decoding='async' className='MovieImage-size' src={tmdbImage(movie.poster_path)} alt='' />
                <span className="poster-caption">
                  {movie.title ? movie.title : movie.original_title}
                  <span className="poster-year">{movie.release_date ? movie.release_date.split('-')[0] : ''}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <HomeTvRows />

      <Footer />
    </div>
  )
};

const UpcomingMovies = () => {
  const queue = new MovieQueue();
  const results = [];

  const [firstResults, setFirstResults] = useState([])
  const [secondResults, setSecondResults] = useState([])
  const [thirdResults, setThirdResults] = useState([])

  useEffect(() => {
      fetch('https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=1&primary_release_date.gte=' + todaysDate[2] + '-' + todaysDate[0] + '-' + todaysDate[1] + '&sort_by=popularity.desc', options)
          .then(res => res.json())
          .then(json => setFirstResults(json.results))
  }, []);

  useEffect(() => {
      fetch('https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=2&primary_release_date.gte=' + todaysDate[2] + '-' + todaysDate[0] + '-' + todaysDate[1] + '&sort_by=popularity.desc', options)
          .then(res => res.json())
          .then(json => setSecondResults(json.results))
  }, []);

  useEffect(() => {
      fetch('https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=en-US&page=4&primary_release_date.gte=' + todaysDate[2] + '-' + todaysDate[0] + '-' + todaysDate[1] + '&sort_by=popularity.desc', options)
          .then(res => res.json())
          .then(json => setThirdResults(json.results))
  }, []);

  // The rest

  firstResults.forEach(res => results.push(res));
  secondResults.forEach(res => results.push(res));
  thirdResults.forEach(res => results.push(res));

  for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const releaseDate = result.release_date.split('-');

      if ((parseInt(releaseDate[0]) === 2024 && parseInt(releaseDate[1]) > todaysDate[0] - 6) || parseInt(releaseDate[0]) > 2024) {
          continue;
      }
      const lowercase = result.original_title.replaceAll(' ', '-').toLowerCase() + '-' + releaseDate[0];

      const map = {
          title: result.original_title,
          page_title: lowercase,
          description: result.overview,
          release: result.release_date,
          poster: tmdbImage(result.poster_path),
          backdrop: result.backdrop_path,
          popularity: result.popularity
      };
      queue.enqueue(map);
  }
/*---------------------------------------------*/

  
  // queue.sort();

  // return (
  //     <div className="UpcomingMovies-section-container">
  //         <div className="UpcomingMovies-text-section-container">
  //             <center>
  //             Upcoming Movies <BiSolidRightArrow />
  //             </center>
  //             </div>
  //             <div className="UpcomingMovies-images">
  //                 <Link to={`/movie/${queue.get(0) == null ? '' : queue.get(0).page_title}`}>
  //                     <img loading='lazy' decoding='async' className='MovieImage-size' src={queue.get(0) == null ? '' : queue.get(0).poster} alt=''></img>
  //                 </Link>

  //                 <Link to={`/movie/${queue.get(1) == null ? '' : queue.get(1).page_title}`}>
  //                     <img loading='lazy' decoding='async' className='MovieImage-size'src={queue.get(1) == null ? '' : queue.get(1).poster} alt=''></img>
  //                 </Link>

  //                 <Link to={`/movie/${queue.get(2) == null ? '' : queue.get(2).page_title}`}>
  //                     <img loading='lazy' decoding='async' className='MovieImage-size'src={queue.get(2) == null ? '' : queue.get(2).poster} alt=''></img>
  //                 </Link>

  //                 <Link to={`/movie/${queue.get(3) == null ? '' : queue.get(3).page_title}`}>
  //                     <img loading='lazy' decoding='async' className='MovieImage-size'src={queue.get(3) == null ? '' : queue.get(3).poster} alt=''></img>
  //                 </Link>

  //                 <Link to={`/movie/${queue.get(4) == null ? '' : queue.get(4).page_title}`}>
  //                     <img loading='lazy' decoding='async' className='MovieImage-size'src={queue.get(4) == null ? '' : queue.get(4).poster} alt=''></img>
  //                 </Link>

  //         </div>
  //     </div>    
  // );
}

export default Home;