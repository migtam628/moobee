import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp, stubApi, type ApiHandler } from '@/test/app';
import { jsonResponse, rawPersonDetails } from '@/test/fixtures';

afterEach(() => {
  vi.unstubAllGlobals();
});

const personHandler: ApiHandler = (url) => {
  if (url.pathname.endsWith('/person/819')) {
    return jsonResponse(rawPersonDetails());
  }
  return jsonResponse({ status_message: 'not found' }, { status: 404 });
};

describe('Person page', () => {
  it('shows the biography and known-for titles', async () => {
    stubApi(personHandler);
    renderApp('/person/819');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edward Norton' }),
    ).toBeInTheDocument();
    expect(screen.getByText('An American actor and filmmaker.')).toBeInTheDocument();
    expect(screen.getByText('Acting')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Known for' })).toBeInTheDocument();
    expect(screen.getByText('Fight Club')).toBeInTheDocument();
    expect(screen.getByText('Some Show')).toBeInTheDocument();
  });

  it('links a cast credit through to the movie page', async () => {
    stubApi(personHandler);
    renderApp('/person/819');
    await screen.findByText('Fight Club');
    expect(screen.getByRole('link', { name: /Fight Club/ })).toHaveAttribute('href', '/movie/550');
  });

  it('shows "not found" for a person id that does not exist', async () => {
    stubApi(personHandler);
    renderApp('/person/999');
    expect(await screen.findByText("We couldn't find that person")).toBeInTheDocument();
  });

  it('shows "not found" for an invalid id without calling the API', async () => {
    const fetchMock = stubApi(personHandler);
    renderApp('/person/abc');
    expect(await screen.findByText("We couldn't find that person")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
