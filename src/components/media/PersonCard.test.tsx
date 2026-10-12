import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PersonCard } from './PersonCard';

describe('PersonCard', () => {
  it('links to the person’s page', () => {
    render(
      <MemoryRouter>
        <PersonCard id={819} name="Edward Norton" subtitle="The Narrator" />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Edward Norton/ });
    expect(link).toHaveAttribute('href', '/person/819');
    expect(screen.getByText('The Narrator')).toBeInTheDocument();
  });

  it('falls back to a placeholder icon when there is no photo', () => {
    render(
      <MemoryRouter>
        <PersonCard id={819} name="Edward Norton" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img')).toBeNull();
  });
});
