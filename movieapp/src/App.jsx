
import './App.css';

import Navbar from './Navbar';

import AuthDetails from './pages/AuthDetails';
import ChatPage from './pages/ChatPage';
import FilmsWatched from './pages/FilmsWatched';
import FollowingPage from './pages/FollowingPage';
import Home from './pages/HomePage';
import IndividualReviewPage from './pages/IndividualReviewPage';
import MembersPage from './pages/MembersPage';
import MoviesPage from './pages/MoviesPage';
import Movie from './pages/Movie';
import MovieMap from './pages/MovieMap';
import MovieReviewPage from './pages/MovieReviewPage';
import Profile from './pages/Profile';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
// import UpcomingMovies from './pages/UpcomingMovies';
import Watchlist from './pages/Watchlist';

import { Route, Routes } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

/**
 * We handle the routing of all pages here, as well as setting
 * up all page loading.
 */

function App() {
  // Pair programming: Pride & Amer.
  const { authUser } = useContext(AuthContext);

  /*
  MovieCache.populate();

  window.onunload = () => {
    window.localStorage.clear();
  }
  */

  return (
    <div className="App">
      <Navbar/>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/films" element={<MoviesPage />} />
        <Route path="/profile/:name" element={<Profile />} />
        <Route path="/profile/:name/logged" element={<FilmsWatched />} />
        <Route path="/profile/:name/watchlist" element={<Watchlist />} />
        <Route path="/profile/:name/reviews" element={<MovieReviewPage />} />
        <Route path="/profile/:name/following" element={<FollowingPage />} />
        <Route path="/films/upcoming" element={<MoviesPage />} />
        <Route path="/films/:genre" element={<MoviesPage />} />
        <Route path="/films/:genre/:popularity" element={<MoviesPage />} />
        <Route path="/films/:genre/:popularity/:decade" element={<MoviesPage />} />
        <Route path="/review/:reviewId" element={<IndividualReviewPage />} />
        <Route path="/movie/:movieid" element={<Movie/>}/>
        <Route path="/moviemap" element={<MovieMap/>}/>
        <Route path="/signin" element={<SignIn/>}/>
        <Route path="/signup" element={<SignUp/>}/>
        <Route path="/signout" element={<AuthDetails/>}/>
        <Route path="/chat" element={<ChatPage/>}/>
        <Route path="/members" element={<MembersPage/>}/>
      </Routes>

      {/* <Home/> */}
      {/* <UpcomingMovies/> */}
      </div>

  );
}

export default App;