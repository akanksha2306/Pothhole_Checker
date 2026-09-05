/**
 * Cloudflare R2 (S3-compatible) photo storage.
 *
 * The client uploads directly to R2 with a presigned PUT URL, so the backend
 * never proxies photo bytes. The Content-Type is pinned inside the signed
 * request, which means the client must send the exact same header on the PUT.
 */
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import type { PhotoContentType, PhotoUploadUrlResponse } from 'shared';
import { env, isR2Configured, r2Endpoint } from '../lib/env.js';
import { AppError, BadRequestError, ServiceUnavailableError } from '../lib/errors.js';

/** Presigned URL lifetime: 15 minutes. */
export const PRESIGN_TTL_SECONDS = 15 * 60;

/** Presigned GET (photo view) lifetime: 5 minutes. */
export const PHOTO_VIEW_TTL_SECONDS = 5 * 60;

const EXTENSION_BY_CONTENT_TYPE: Record<PhotoContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : '';
}

function errorStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && '$metadata' in error) {
    const metadata = (error as { $metadata?: { httpStatusCode?: number } }).$metadata;
    return metadata?.httpStatusCode;
  }
  return undefined;
}

export class StorageService {
  private s3?: S3Client;

  constructor(private readonly bucket: string = env.R2_BUCKET) {}

  isConfigured(): boolean {
    return isR2Configured();
  }

  /**
   * Builds a presigned PUT URL. 503 SERVICE_UNAVAILABLE when R2 credentials are
   * not configured yet (dev runs on placeholders).
   */
  async createPhotoUploadUrl(userId: string, contentType: PhotoContentType): Promise<PhotoUploadUrlResponse> {
    const client = this.ensureClient();
    const key = this.buildPhotoKey(userId, contentType);

    try {
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
        { expiresIn: PRESIGN_TTL_SECONDS },
      );
      return { uploadUrl, key, expiresIn: PRESIGN_TTL_SECONDS };
    } catch (error) {
      console.error('[storage] failed to presign upload URL:', error instanceof Error ? error.message : error);
      throw new ServiceUnavailableError('Could not create the photo upload URL');
    }
  }

  /**
   * Confirms a `photoKey` really refers to an uploaded object. Callers skip this
   * when storage is unconfigured (placeholder env). The error thrown for a
   * missing object is caller-supplied because the semantics differ: a client
   * posting an unknown key gets a 400, while viewing a report whose photo has
   * vanished is a 404.
   */
  async assertPhotoExists(key: string, missingError: AppError = new BadRequestError('photoKey does not reference an uploaded photo')): Promise<void> {
    const client = this.ensureClient();

    try {
      await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if (errorName(error) === 'NoSuchKey' || errorName(error) === 'NotFound' || errorStatusCode(error) === 404) {
        throw missingError;
      }
      console.error('[storage] HeadObject failed:', error instanceof Error ? error.message : error);
      throw new ServiceUnavailableError('Could not verify the uploaded photo');
    }
  }

  /** Presigned GET URL for `<img src>` use; the object is not fetched server-side. */
  async createPhotoViewUrl(key: string): Promise<string> {
    const client = this.ensureClient();

    try {
      return await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn: PHOTO_VIEW_TTL_SECONDS },
      );
    } catch (error) {
      console.error('[storage] failed to presign view URL:', error instanceof Error ? error.message : error);
      throw new ServiceUnavailableError('Could not create the photo URL');
    }
  }

  /** `reports/{userId}/{id}.{ext}` — keeps every user's objects in one prefix. */
  private buildPhotoKey(userId: string, contentType: PhotoContentType): string {
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType];
    return `reports/${userId}/${randomUUID()}.${extension}`;
  }

  private ensureClient(): S3Client {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError('Photo storage is not configured');
    }
    if (!this.s3) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint(),
        credentials: {
          accessKeyId: env.R2_ACCESS_KEY_ID,
          secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
    return this.s3;
  }
}

/** Singleton; the S3 client is created lazily on first use. */
export const storageService = new StorageService();
