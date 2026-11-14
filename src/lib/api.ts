import type {
  Advice,
  AdviceRequest,
  Area,
  Charts,
  Evidence,
  GeoCollection,
  Health,
  Nearest,
  Place,
  Profile,
  Questions,
  Scenario,
  ScenarioInput,
  SearchPlace,
  State,
} from './types';
import { ui } from './copy';
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1').replace(/\/$/, '');
export const fixturesEnabled = process.env.NEXT_PUBLIC_ENABLE_FIXTURES === 'true';
export class Client {
  constructor(
    public fixture = false,
    private transport: typeof fetch = fetch,
  ) {}
  async request<T>(path: string, body?: unknown): Promise<T> {
    if (this.fixture) {
      const { fixtureRequest } = await import('./fixtures');
      return (await fixtureRequest(path, body)) as T;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await this.transport(API_BASE + path, {
        method: body === undefined ? 'GET' : 'POST',
        headers:
          body === undefined
            ? { Accept: 'application/json' }
            : { Accept: 'application/json', 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiError(
          data?.error?.code ?? 'network_error',
          data?.error?.message ?? ui.network,
          response.status,
          data?.error ?? {},
        );
      }
      return (await response.json()) as T;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('network_error', ui.network, 0);
    } finally {
      clearTimeout(timeout);
    }
  }
  health = () => this.request<Health>('/health');
  questions = () => this.request<Questions>('/meta/questions?language=en');
  states = () => this.request<State[]>('/places/states');
  areas = (state: string) =>
    this.request<Area[]>(`/places/states/${encodeURIComponent(state)}/areas`);
  search = (q: string) =>
    this.request<SearchPlace[]>('/places/search?' + new URLSearchParams({ q }));
  locate = (lat: number, lon: number) =>
    this.request<SearchPlace & { lat: number; lon: number; nearest_ready: Nearest | null }>(
      '/places/locate?' + new URLSearchParams({ lat: String(lat), lon: String(lon) }),
    );
  nearest = (place: Place) =>
    this.request<Nearest>(
      '/places/nearest-ready?' + new URLSearchParams({ state: place.state, lga: place.lga }),
    );
  profile = (place: Place, from: Place | null) =>
    this.request<Profile>(
      '/places/profile?' +
        new URLSearchParams({
          state: place.state,
          lga: place.lga,
          ...(from ? { from_state: from.state, from_lga: from.lga } : {}),
          language: 'en',
        }),
    );
  map = (state: string) => this.request<GeoCollection>(`/map/states/${encodeURIComponent(state)}`);
  advice = (body: AdviceRequest) => this.request<Advice>('/advice', body);
  charts = (id: string) => this.request<Charts>(`/advice/${encodeURIComponent(id)}/charts`);
  scenario = (id: string, body: ScenarioInput) =>
    this.request<Scenario>(`/advice/${encodeURIComponent(id)}/scenario`, body);
  evidence = (id: string) => this.request<Evidence>(`/evidence/${encodeURIComponent(id)}`);
  async withRecovery<T>(
    advice: Advice,
    request: AdviceRequest,
    operation: (id: string) => Promise<T>,
    refresh: (a: Advice) => void,
  ): Promise<T> {
    try {
      return await operation(advice.advice_id);
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'advice_expired') throw e;
      const fresh = await this.advice(request);
      refresh(fresh);
      return operation(fresh.advice_id);
    }
  }
  async download(id: string, kind: 'text' | 'agent-report', advice: Advice) {
    if (this.fixture)
      return {
        blob: new Blob([advice.text], { type: kind === 'text' ? 'text/plain' : 'text/markdown' }),
        filename: `ihayo-DEMONSTRATION.${kind === 'text' ? 'txt' : 'md'}`,
      };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    try {
      const response = await this.transport(
        `${API_BASE}/advice/${encodeURIComponent(id)}/${kind}?download=true`,
        { signal: controller.signal },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiError(
          data?.error?.code ?? 'network_error',
          data?.error?.message ?? ui.network,
          response.status,
          data?.error ?? {},
        );
      }
      const header = response.headers.get('Content-Disposition') ?? '';
      const filename =
        header.match(/filename="?([^";]+)"?/)?.[1]?.replace(/[\\/]/g, '_') ??
        `farm-advice.${kind === 'text' ? 'txt' : 'md'}`;
      return { blob: await response.blob(), filename };
    } catch (e) {
      if (e instanceof ApiError) throw e;
      throw new ApiError('network_error', ui.network, 0);
    } finally {
      clearTimeout(timer);
    }
  }
}
