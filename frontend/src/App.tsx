import { useEffect, useRef, useState } from 'react';
import { api as defaultApi, ApiError, type Api } from './api/client';
import { mode, type MockMode } from './api/config';
import { strings, type Language } from './i18n';

export default function App({ api = defaultApi, mockMode = mode }: { api?: Api; mockMode?: MockMode }) {
  const [language, setLanguage] = useState<Language>(() => navigator.language.toLowerCase().startsWith('zh') ? 'zh-Hant' : 'en');
  const [data, setData] = useState<{ message: string; count: number }>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>();
  const [incrementError, setIncrementError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const lifetime = useRef<AbortController | null>(null);
  const incrementPending = useRef(false);
  const t = strings[language];
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    Promise.all([api.getHello(controller.signal), api.getCount(controller.signal)])
      .then(([hello, counter]) => {
        if (!controller.signal.aborted) setData({ ...hello, ...counter });
      })
      .catch((error: unknown) => { if (!controller.signal.aborted) setLoadError(error); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, reload]);
  function retryLoad() { setLoading(true); setLoadError(undefined); setReload(value => value + 1); }
  async function increment() {
    const controller = lifetime.current;
    if (!controller || controller.signal.aborted || incrementPending.current) return;
    incrementPending.current = true;
    setBusy(true); setIncrementError(undefined);
    try {
      const result = await api.increment(controller.signal);
      if (!controller.signal.aborted) setData(previous => previous && { ...previous, count: result.count });
    } catch (error) { if (!controller.signal.aborted) setIncrementError(error); }
    finally {
      incrementPending.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  const status = (error: unknown) => error instanceof ApiError && error.status !== undefined ? ` (HTTP ${error.status})` : '';
  return <main className="page">
    <article className="card">
      <header><span className="eyebrow">HELLO / +1</span><button className="language" onClick={() => setLanguage(language === 'en' ? 'zh-Hant' : 'en')}>{t.toggle}</button></header>
      <h1>{t.title}</h1>
      {mockMode !== 'off' && <p className="badge">{t.mock} · {mockMode === 'all' ? t.allMode : t.counterMode}</p>}
      <div className="content" aria-busy={loading}>
        {loading ? <p role="status" className="loading">{t.loading}</p> : loadError ? <div><p role="alert">{t.loadError}{status(loadError)}</p><button onClick={retryLoad}>{t.retry}</button></div> : data && <>
          <section aria-labelledby="hello-label"><h2 id="hello-label">{t.hello}</h2><blockquote>{data.message}</blockquote></section>
          <section className="counter" aria-labelledby="counter-label"><h2 id="counter-label">{t.counter}</h2>
            <div className="counter-row"><span className="number">{data.count}</span><button className="add" aria-label={t.add} aria-busy={busy} aria-disabled={busy} onClick={() => { void increment(); }}>+1</button></div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">{t.countStatus}{data.count}</p>
            {incrementError !== undefined && <div><p role="alert">{t.incrementError}{status(incrementError)}</p><button aria-disabled={busy} onClick={() => { void increment(); }}>{t.retry}</button></div>}
          </section>
        </>}
      </div>
    </article>
  </main>;
}
