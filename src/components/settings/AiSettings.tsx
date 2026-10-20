import { CircleAlert, CircleCheck, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getAiErrorMessage, testAiConnection } from '@/api/ai/client';
import { SettingRow } from '@/components/settings/SettingsSection';
import { useSettings } from '@/hooks/useSettings';
import { AI_PROVIDER_INFO } from '@/lib/ai';
import { cn } from '@/lib/cn';
import type { AiProvider } from '@/types/settings';

type TestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'ok'; model: string }
  | { status: 'error'; message: string };

const PROVIDERS = Object.keys(AI_PROVIDER_INFO) as AiProvider[];

/** The AI part of Settings: which provider, which model, the viewer's key, and a test button. */
export function AiSettings() {
  const { settings, hasAiKey, update } = useSettings();
  const { provider, model, apiKey } = settings.ai;
  const info = AI_PROVIDER_INFO[provider];

  const [showKey, setShowKey] = useState(false);
  const [test, setTest] = useState<TestState>({ status: 'idle' });
  const aborter = useRef<AbortController | undefined>(undefined);

  useEffect(
    () => () => {
      aborter.current?.abort();
    },
    [],
  );

  // A result about one key or model says nothing about the next.
  const forgetTest = () => {
    aborter.current?.abort();
    setTest({ status: 'idle' });
  };

  const runTest = async () => {
    aborter.current?.abort();
    const controller = new AbortController();
    aborter.current = controller;
    setTest({ status: 'testing' });
    try {
      const answered = await testAiConnection({ provider, model, apiKey }, controller.signal);
      setTest({ status: 'ok', model: answered });
    } catch (error) {
      if (controller.signal.aborted) return;
      setTest({ status: 'error', message: getAiErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-5">
      <SettingRow label="Provider" hint="Whose API your key belongs to.">
        <div role="group" aria-label="Provider" className="flex gap-2">
          {PROVIDERS.map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={provider === id}
              onClick={() => {
                forgetTest();
                update({ ai: { provider: id } });
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                provider === id ? 'bg-fg text-canvas' : 'bg-white/10 text-fg hover:bg-white/15',
              )}
            >
              {AI_PROVIDER_INFO[id].label}
            </button>
          ))}
        </div>
      </SettingRow>

      <SettingRow
        label="API key"
        htmlFor="ai-key"
        hint={`Get one at ${info.keyUrl.replace('https://', '')}. It looks like ${info.keyExample}`}
      >
        <div className="flex w-full items-center gap-2 sm:w-80">
          <div className="relative flex-1">
            <KeyRound
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
            />
            <input
              id="ai-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              autoComplete="off"
              spellCheck={false}
              placeholder={info.keyExample}
              onChange={(event) => {
                forgetTest();
                update({ ai: { apiKey: event.target.value } });
              }}
              className="w-full rounded-lg border border-line bg-canvas py-2 pr-3 pl-9 text-sm text-fg placeholder:text-muted/60"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setShowKey((value) => !value);
            }}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
            className="grid size-9 place-items-center rounded-lg bg-white/10 text-fg transition hover:bg-white/15"
          >
            {showKey ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </SettingRow>

      <SettingRow
        label="Model"
        htmlFor="ai-model"
        hint={`Leave blank for ${info.defaultModel}, a fast and cheap choice.`}
      >
        <input
          id="ai-model"
          type="text"
          value={model}
          autoComplete="off"
          spellCheck={false}
          placeholder={info.defaultModel}
          onChange={(event) => {
            forgetTest();
            update({ ai: { model: event.target.value } });
          }}
          className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-fg placeholder:text-muted/60 sm:w-80"
        />
      </SettingRow>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void runTest();
          }}
          disabled={!hasAiKey || test.status === 'testing'}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-fg transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          {test.status === 'testing' ? 'Testing…' : 'Test connection'}
        </button>
        {hasAiKey ? (
          <button
            type="button"
            onClick={() => {
              forgetTest();
              update({ ai: { apiKey: '' } });
            }}
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-fg transition hover:bg-white/15"
          >
            Remove key
          </button>
        ) : null}

        <p role="status" className="text-sm">
          {test.status === 'ok' ? (
            <span className="inline-flex items-center gap-1.5 text-fg">
              <CircleCheck aria-hidden="true" className="size-4 text-accent" />
              Works. Answered by {test.model}.
            </span>
          ) : test.status === 'error' ? (
            <span className="inline-flex items-center gap-1.5 text-danger">
              <CircleAlert aria-hidden="true" className="size-4" />
              {test.message}
            </span>
          ) : null}
        </p>
      </div>

      <p className="text-xs leading-relaxed text-muted">
        Your key is saved in this browser only. When you ask the AI for picks it is sent to this
        site&apos;s server, which passes it to {info.label} and does not keep it. Use a key with a
        small spending limit, and remove it here on a computer you share.
      </p>
    </div>
  );
}
