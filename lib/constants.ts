export const AREAS = [
    { value: "pcb", label: "PCB" },
    { value: "firmware", label: "Firmware" },
    { value: "mechanical", label: "Mechanical" },
    { value: "power", label: "Power" },
    { value: "connector", label: "Connector" },
    { value: "fixture", label: "Test fixture" },
    { value: "other", label: "Other" },
] as const;

export const PRIORITIES = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
] as const;

export const STATUSES = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "blocked", label: "Blocked" },
    { value: "done", label: "Done" },
] as const;

export const TAGS = [
    { value: "firmware", label: "Firmware" },
    { value: "enclosure", label: "Enclosure" },
    { value: "electrical/ mechanical", label: "Electrical/ Mechanical" },
] as const;

export type Area = (typeof AREAS)[number]["value"];
export type Tag = (typeof TAGS)[number]["value"];
export type Priority = (typeof PRIORITIES)[number]["value"];
export type Status = (typeof STATUSES)[number]["value"];

export const BUCKET = "proofissues";
export const MAX_PROOF_BYTES = 80 * 1024 * 1024;
export const PROOF_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/quicktime",
]);
export const PROOF_ACCEPT =
    "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov";

export function isVideoType(contentType: string) {
    return contentType.startsWith("video/");
}

const tagValues = new Set<string>(TAGS.map((item) => item.value));
const areaValues = new Set<string>(AREAS.map((item) => item.value));
const priorityValues = new Set<string>(PRIORITIES.map((item) => item.value));
const statusValues = new Set<string>(STATUSES.map((item) => item.value));

export function isTag(value: string): value is Tag {
    return tagValues.has(value);
}

export function isArea(value: string): value is Area {
    return areaValues.has(value);
}

export function isPriority(value: string): value is Priority {
    return priorityValues.has(value);
}

export function isStatus(value: string): value is Status {
    return statusValues.has(value);
}

export function labelFor(
    list: readonly { value: string; label: string }[],
    value: string,
) {
    return list.find((item) => item.value === value)?.label ?? value;
}
