// KV.list returns at most 1,000 keys per request. Always follow its cursor.
export async function listRecords(kv, prefix) {
    const records = [];
    let cursor;
    do {
        const page = await kv.list({ prefix, ...(cursor ? { cursor } : {}) });
        for (const key of page.keys) {
            const value = await kv.get(key.name, { type: 'json' });
            if (value) records.push(value);
        }
        cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    return records;
}

export const ASSET_TYPES = Object.freeze({
    worldbook: '世界书',
    preset: '预设',
    script: '脚本'
});

export const ASSET_EXTENSIONS = new Set(['json', 'txt', 'js', 'yaml', 'yml', 'zip']);

export function assetKey(type, id) {
    return `asset:${type}:${id}`;
}

export function isAssetType(type) {
    return Object.hasOwn(ASSET_TYPES, type);
}

export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export function downloadHeaders(fileName, contentType = 'application/octet-stream') {
    const safeName = String(fileName || 'download').replace(/[\r\n\\/]/g, '_');
    const fallback = safeName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
    return {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
    };
}
