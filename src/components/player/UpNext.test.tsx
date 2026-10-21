import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpNext, type UpNextItem, type UpNextTab } from './UpNext';

const item = (n: number, overrides: Partial<UpNextItem> = {}): UpNextItem => ({
  key: `k${n}`,
  href: `/watch/tv/1/1/${n}`,
  title: `${n}. Episode ${n}`,
  kind: 'tv',
  ...overrides,
});

const tabs: UpNextTab[] = [
  {
    id: 'episodes',
    label: 'Episodes',
    items: [item(1, { current: true, badge: '47m' }), item(2)],
    emptyText: 'No episodes.',
  },
  { id: 'more', label: 'More like this', items: [], emptyText: 'Nothing like this yet.' },
];

const renderList = (list: readonly UpNextTab[] = tabs, onAutoplayChange = vi.fn()) => {
  render(
    <MemoryRouter>
      <UpNext tabs={list} autoplay onAutoplayChange={onAutoplayChange} />
    </MemoryRouter>,
  );
  return onAutoplayChange;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UpNext', () => {
  it('lists the first chip, marks the playing row and shows its badge', () => {
    renderList();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('aria-current', 'true');
    expect(within(links[0]!).getByText('Now playing')).toBeInTheDocument();
    expect(within(links[0]!).getByText('47m')).toBeInTheDocument();
    expect(links[1]).not.toHaveAttribute('aria-current');
    expect(links[1]).toHaveAttribute('href', '/watch/tv/1/1/2');
  });

  it('switches chips, and says so when a chip has nothing', async () => {
    renderList();
    expect(screen.getByRole('button', { name: 'Episodes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'More like this' }));
    expect(screen.getByRole('button', { name: 'More like this' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Nothing like this yet.')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('shows no chip row for a single list', () => {
    renderList([tabs[0]!]);
    expect(screen.queryByRole('group', { name: 'Show' })).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('shows the chip toolbar (a season picker) above the list', () => {
    renderList([{ ...tabs[0]!, toolbar: <p>Season picker</p> }]);
    expect(screen.getByText('Season picker')).toBeInTheDocument();
  });

  it('drops a picture that fails to load and shows the placeholder instead', () => {
    renderList([
      {
        id: 'a',
        label: 'A',
        items: [item(1, { thumbnailUrl: 'https://image.tmdb.org/x.jpg' })],
        emptyText: '',
      },
    ]);
    const picture = document.querySelector('img');
    expect(picture).not.toBeNull();
    fireEvent.error(picture!);
    expect(document.querySelector('img')).toBeNull();
  });

  it('passes the Autoplay switch through', async () => {
    const onChange = renderList();
    await userEvent.click(screen.getByRole('switch', { name: /Autoplay/ }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
