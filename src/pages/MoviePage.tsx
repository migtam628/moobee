import { useParams } from 'react-router-dom';
import { DetailsView } from '@/components/details/DetailsView';
import { useMovieDetails } from '@/hooks/useMediaQueries';
import { parseRouteId } from '@/lib/routes';

export function MoviePage() {
  const { id: idParam } = useParams();
  const id = parseRouteId(idParam);
  const query = useMovieDetails(id);

  return <DetailsView query={query} isValidId={id !== undefined} noun="movie" />;
}

export const Component = MoviePage;
