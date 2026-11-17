import { Buffer } from 'node:buffer';
import { config } from '../config.js';
import {
  spotifyPlaylistTracksResponseSchema,
  spotifySearchResponseSchema,
  spotifyTokenResponseSchema,
  type SpotifyPlaylistTracksResponse,
  type SpotifySearchResponse,
} from './types.js';

const spotifyApiBaseUrl = 'https://api.spotify.com/v1';
const spotifyAccountsUrl = 'https://accounts.spotify.com/api/token';

export class SpotifyApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'SpotifyApiError';
  }
}

interface SpotifyClientOptions {
  clientId: string;
  clientSecret: string;
  market: string;
}

export class SpotifyClient {
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;
  private tokenRequest: Promise<string> | null = null;

  public constructor(private readonly options: SpotifyClientOptions) {}

  public get isConfigured(): boolean {
    return this.options.clientId.length > 0 && this.options.clientSecret.length > 0;
  }

  public get isAuthenticated(): boolean {
    return this.accessToken !== null && this.tokenExpiresAt > Date.now();
  }

  public async searchTracks(query: string, yearRange?: string): Promise<SpotifySearchResponse> {
    const searchQuery = yearRange ? `${query} year:${yearRange}` : query;
    const url = new URL(`${spotifyApiBaseUrl}/search`);
    url.searchParams.set('q', searchQuery);
    url.searchParams.set('type', 'track');
    url.searchParams.set('limit', '50');
    url.searchParams.set('market', this.options.market);
    return this.request(url, spotifySearchResponseSchema);
  }

  public async getPlaylistTracks(
    playlistId: string,
    offset: number,
    limit: number,
  ): Promise<SpotifyPlaylistTracksResponse> {
    const url = new URL(`${spotifyApiBaseUrl}/playlists/${playlistId}/items`);
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('market', this.options.market);
    return this.request(url, spotifyPlaylistTracksResponseSchema);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.isConfigured) throw new Error('Spotify API credentials are not configured.');
    if (this.accessToken && this.tokenExpiresAt > Date.now() + 60_000) return this.accessToken;
    if (this.tokenRequest) return this.tokenRequest;

    this.tokenRequest = this.refreshAccessToken();
    try {
      return await this.tokenRequest;
    } finally {
      this.tokenRequest = null;
    }
  }

  private async refreshAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64');
    const response = await fetch(spotifyAccountsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new SpotifyApiError(`Spotify token request failed with HTTP ${response.status}.`, response.status);
    }

    const token = spotifyTokenResponseSchema.parse(await response.json());
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + token.expires_in * 1000;
    return token.access_token;
  }

  private async request<T>(url: URL, schema: { parse: (value: unknown) => T }): Promise<T> {
    const accessToken = await this.getAccessToken();
    for (let attempt = 1; attempt <= config.spotifyMaxAttempts; attempt += 1) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) return schema.parse(await response.json());

      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) : undefined;
      if (response.status !== 429 || attempt === config.spotifyMaxAttempts) {
        throw new SpotifyApiError(
          `Spotify API request failed with HTTP ${response.status}.`,
          response.status,
          retryAfterSeconds,
        );
      }

      const fallbackDelay = 2 ** (attempt - 1) * 500;
      const retryDelay = Math.min(
        (Number.isFinite(retryAfterSeconds) ? retryAfterSeconds! * 1000 : fallbackDelay),
        config.spotifyMaxRetryDelayMs,
      );
      await new Promise<void>((resolve) => setTimeout(resolve, retryDelay));
    }

    throw new SpotifyApiError('Spotify API request retry limit reached.', 429);
  }
}
