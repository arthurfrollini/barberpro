const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from clients as plain strings; a malformed one simply matches nothing. */
export const isUuid = (value: string): boolean => UUID.test(value);
