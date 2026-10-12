import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

function Harness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Open
      </button>
      {open ? (
        <Modal
          title="Trailer"
          onClose={() => {
            onClose?.();
            setOpen(false);
          }}
        >
          <button type="button">Inside</button>
        </Modal>
      ) : null}
    </>
  );
}

describe('Modal', () => {
  it('is a labelled modal dialog that moves focus into itself', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    const dialog = screen.getByRole('dialog', { name: 'Trailer' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
  });

  it('locks page scroll while open and restores it after', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(trigger);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes from the close button and from a backdrop click, but not from a click inside', async () => {
    render(<Harness />);
    const open = async () => userEvent.click(screen.getByRole('button', { name: 'Open' }));

    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Inside' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();

    await open();
    const backdrop = screen.getByRole('dialog').parentElement;
    expect(backdrop).not.toBeNull();
    if (backdrop) await userEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('keeps Tab focus inside the dialog', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));

    // DOM order inside the dialog: Close button (header), then the content.
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
    await userEvent.tab(); // past the last control: wraps to the first instead of leaving
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.tab({ shift: true }); // before the first control: wraps to the last
    expect(screen.getByRole('button', { name: 'Inside' })).toHaveFocus();
  });
});
