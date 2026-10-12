import { Search, X } from 'lucide-react';
import { useEffect, useRef, type FormEvent } from 'react';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter. The page usually searches as you type, so this just dismisses the keyboard. */
  onSubmit?: () => void;
  /** Focus the input on mount (used when arriving without a query). */
  autoFocus?: boolean;
}

/** Controlled search field. Debouncing is the caller's job so the input itself stays instant. */
export function SearchBox({ value, onChange, onSubmit, autoFocus = false }: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    inputRef.current?.blur();
    onSubmit?.();
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
      />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        aria-label="Search movies, TV shows and people"
        placeholder="Search movies, TV shows and people"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        maxLength={100}
        className="w-full rounded-full border border-line bg-surface py-3.5 pr-12 pl-12 text-base text-fg placeholder:text-muted focus:border-accent/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-white/10 hover:text-fg"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </form>
  );
}
