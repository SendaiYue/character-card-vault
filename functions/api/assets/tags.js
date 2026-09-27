import { isAssetType, json, listRecords } from '../../utils/storage.js';

export async function onRequestGet(context) {
    try {
        const type = new URL(context.request.url).searchParams.get('type');
        if (!isAssetType(type)) return json({ ok: false, error: '无效的分类' }, 400);
        const assets = await listRecords(context.env.CARDS_KV, `asset:${type}:`);
        const tags = [...new Set(assets.flatMap(asset => asset.tags || []))].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
        return json({ ok: true, data: tags });
    } catch (error) {
        return json({ ok: false, error: error.message }, 500);
    }
}
