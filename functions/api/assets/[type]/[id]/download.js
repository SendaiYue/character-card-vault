import { downloadFromTelegram } from '../../../../utils/telegram.js';
import { assetKey, downloadHeaders, isAssetType, json } from '../../../../utils/storage.js';

export async function onRequestGet(context) {
    try {
        const { type, id } = context.params;
        if (!isAssetType(type)) return json({ ok: false, error: '文件不存在' }, 404);
        const asset = await context.env.CARDS_KV.get(assetKey(type, id), { type: 'json' });
        if (!asset?.telegramFileId) return json({ ok: false, error: '文件不存在' }, 404);
        const response = await downloadFromTelegram(context.env.TG_BOT_TOKEN, asset.telegramFileId);
        if (!response.ok) return json({ ok: false, error: '下载失败' }, 502);
        return new Response(response.body, { headers: downloadHeaders(asset.fileName) });
    } catch (error) {
        return json({ ok: false, error: error.message }, 500);
    }
}
