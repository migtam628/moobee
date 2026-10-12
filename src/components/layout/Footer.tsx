export function Footer() {
  return (
    <footer className="mt-12 page-gutter border-t border-line pt-8 pb-28 md:pb-10">
      <p className="max-w-2xl text-xs leading-relaxed text-muted">
        This product uses the TMDB API but is not endorsed or certified by TMDB. Movie and TV
        metadata and imagery are provided by{' '}
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-fg underline underline-offset-2 hover:text-accent"
        >
          The Movie Database (TMDB)
        </a>
        .
      </p>
      <p className="mt-2 text-xs text-muted/70">© {new Date().getFullYear()} MooBee</p>
    </footer>
  );
}
