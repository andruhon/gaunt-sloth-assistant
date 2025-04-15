export function toFileSafeString(string) {
    return string.replace(/[^A-Za-z0-9]/g, '-');
}

export function fileSafeLocalDate() {
    const date = new Date();
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const msLocal =  date.getTime() - offsetMs;
    const dateLocal = new Date(msLocal);
    const iso = dateLocal.toISOString();
    const isoLocal = iso.slice(0, 19);
    return toFileSafeString(isoLocal);
}