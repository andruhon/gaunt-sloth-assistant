/**
 * Simple provider returning text as it is.
 */
export async function get(_, text) {
    return text;
}