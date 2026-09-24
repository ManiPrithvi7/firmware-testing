const REQUIRED_DB = ["DATABASE_URL"] as const;
const REQUIRED_STORAGE = [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_ENDPOINT_URL_S3",
    "AWS_REGION",
] as const;

export function missingDatabaseEnv() {
    return REQUIRED_DB.filter((key) => !process.env[key]);
}

export function missingStorageEnv() {
    return REQUIRED_STORAGE.filter((key) => !process.env[key]);
}
