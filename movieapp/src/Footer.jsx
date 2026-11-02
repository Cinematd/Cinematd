/**
 * Footer:
 * Set like the end credits of a film. Used on the Home and Movie pages.
 */

export default function Footer() {
  return (
    <footer className="site-credits">
      <p className="transition-cue transition-cue--end" aria-hidden="true">FADE OUT.</p>
      <p className="credits-wordmark">Cinematd</p>
      <dl className="credits-roll">
        <dt>Co-founded by</dt>
        <dd>Amer Issa</dd>
        <dd>Pride Yin</dd>
      </dl>
      <p className="credits-legal">
        © Cinematd. Film data and images from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </footer>
  );
}
