import {
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutBucketCorsCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { BUCKET } from "@/lib/constants";
import { missingStorageEnv } from "@/lib/env";

// Credentials, region, and AWS_ENDPOINT_URL_S3 come from the environment
// that `neon deploy` writes. Path-style addressing is required by Neon.
// WHEN_REQUIRED avoids checksum query params that reject real uploads.
export const s3 = new S3Client({
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

function assertStorage() {
    const missing = missingStorageEnv();
    if (missing.length > 0) {
        throw new Error(`Object storage is not configured (${missing.join(", ")}).`);
    }
}

let corsReady: Promise<void> | null = null;

function ensureUploadCors() {
    if (!corsReady) {
        corsReady = s3
            .send(
                new PutBucketCorsCommand({
                    Bucket: BUCKET,
                    CORSConfiguration: {
                        CORSRules: [
                            {
                                AllowedOrigins: ["*"],
                                AllowedMethods: ["GET", "PUT", "HEAD"],
                                AllowedHeaders: ["*"],
                                ExposeHeaders: ["ETag"],
                                MaxAgeSeconds: 3600,
                            },
                        ],
                    },
                }),
            )
            .then(() => undefined)
            .catch((error) => {
                corsReady = null;
                throw error;
            });
    }
    return corsReady;
}

export async function proofUploadUrl(key: string, contentType: string) {
    assertStorage();
    await ensureUploadCors().catch(() => undefined);
    return getSignedUrl(
        s3,
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            ContentType: contentType,
        }),
        { expiresIn: 900 },
    );
}

export async function proofObjectSize(key: string) {
    assertStorage();
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return head.ContentLength ?? 0;
}

export async function proofViewUrl(key: string) {
    if (missingStorageEnv().length > 0) return null;
    return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 3600 },
    );
}

export async function deleteProofObject(key: string) {
    assertStorage();
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function deleteProofObjects(keys: string[]) {
    if (keys.length === 0) return;
    assertStorage();
    await s3.send(
        new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
        }),
    );
}
