import { useParams } from 'react-router-dom';
import { DetailsView } from '@/components/details/DetailsView';
import { useTvDetails } from '@/hooks/useMediaQueries';
import { parseRouteId } from '@/lib/routes';

export function TvPage() {
  const { id: idParam } = useParams();
  const id = parseRouteId(idParam);
  const query = useTvDetails(id);

  return <DetailsView query={query} isValidId={id !== undefined} noun="show" />;
}

export const Component = TvPage;
