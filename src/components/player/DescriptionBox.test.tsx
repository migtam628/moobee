import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DescriptionBox } from './DescriptionBox';

const renderBox = (props: Parameters<typeof DescriptionBox>[0]) =>
  render(
    <MemoryRouter>
      <DescriptionBox {...props} />
    </MemoryRouter>,
  );

describe('DescriptionBox', () => {
  it('renders nothing when there is nothing to say', () => {
    const { container } = renderBox({});
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the stats line, the genres as hashtags and the synopsis', () => {
    renderBox({
      stats: '★ 8.4 · 28K votes',
      tags: ['Drama', 'Sci-Fi', 'Anime'],
      overview: 'A short synopsis.',
    });
    expect(screen.getByText('★ 8.4 · 28K votes')).toBeInTheDocument();
    expect(screen.getByText('#Drama')).toBeInTheDocument();
    expect(screen.getByText('#SciFi')).toBeInTheDocument();
    expect(screen.getByText('#Anime')).toBeInTheDocument();
    expect(screen.getByText('A short synopsis.')).toBeInTheDocument();
    // Nothing more to open: no "more" button.
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens to show the credits and closes again', async () => {
    renderBox({
      overview: 'x'.repeat(400),
      tagline: 'Change the equation.',
      details: [{ label: 'Created by', value: 'Vince Gilligan' }],
      cast: [{ id: 17419, name: 'Bryan Cranston', character: 'Walter White' }],
    });

    const toggle = screen.getByRole('button', { name: '…more' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Vince Gilligan')).toBeNull();

    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Change the equation.')).toBeInTheDocument();
    expect(screen.getByText('Created by')).toBeInTheDocument();
    expect(screen.getByText('Vince Gilligan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bryan Cranston' })).toHaveAttribute(
      'href',
      '/person/17419',
    );
    expect(screen.getByText(/as Walter White/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(screen.queryByText('Vince Gilligan')).toBeNull();
  });
});
