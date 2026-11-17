import { z } from "zod";

const spotifyImageSchema = z.object({ url: z.url() });

export const spotifyTrackSchema = z.object({
  id: z
    .string()
    .regex(/^[A-Za-z0-9]{22}$/)
    .nullable(),
  name: z.string(),
  type: z.literal("track"),
  is_local: z.boolean().optional(),
  duration_ms: z.number().int().nonnegative(),
  popularity: z.number().int().min(0).max(100),
  uri: z.string(),
  artists: z.array(z.object({ name: z.string().min(1) })),
  album: z.object({
    name: z.string().min(1),
    release_date: z.string().optional(),
    images: z.array(spotifyImageSchema),
  }),
});

export const spotifySearchResponseSchema = z.object({
  tracks: z.object({
    items: z.array(spotifyTrackSchema),
  }),
});

export const spotifyPlaylistTracksResponseSchema = z.object({
  items: z.array(
    z.object({
      item: spotifyTrackSchema.nullable().optional(),
      track: spotifyTrackSchema.nullable().optional(),
    }),
  ),
  next: z.url().nullable(),
  total: z.number().int().nonnegative(),
});

export const spotifyTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
});

export type SpotifyTrack = z.infer<typeof spotifyTrackSchema>;
export type SpotifySearchResponse = z.infer<typeof spotifySearchResponseSchema>;
export type SpotifyPlaylistTracksResponse = z.infer<
  typeof spotifyPlaylistTracksResponseSchema
>;
