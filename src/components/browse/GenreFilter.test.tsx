import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { GenreFilter } from './GenreFilter';

const genres = [
  { id: 28, name: 'Action' },
  { id: 18, name: 'Drama' },
];

describe('GenreFilter', () => {
  it('renders nothing while the genre list is empty (still loading)', () => {
    const { container } = render(
      <GenreFilter genres={[]} activeGenreId={undefined} onChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('marks "All" pressed when no genre is active', () => {
    render(<GenreFilter genres={genres} activeGenreId={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the active genre pressed', () => {
    render(<GenreFilter genres={genres} activeGenreId={18} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Drama' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the chosen genre id, or undefined for "All"', async () => {
    const onChange = vi.fn();
    render(<GenreFilter genres={genres} activeGenreId={28} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Drama' }));
    expect(onChange).toHaveBeenCalledWith(18);

    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
