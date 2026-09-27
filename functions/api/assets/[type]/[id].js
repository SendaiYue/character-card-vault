import { deleteTelegramMessage } from '../../../utils/telegram.js';
import { assetKey, isAssetType, json } from '../../../utils/storage.js';

async function load(context) {
    if (!isAssetType(context.params.type)) return null;
    return context.env.CARDS_KV.get(assetKey(context.params.type, context.params.id), { type: 'json' });
}

export async function onRequestGet(context) {
    const asset = await load(context);
    return asset ? json({ ok: true, data: asset }) : json({ ok: false, error: '文件不存在' }, 404);
}

export async function onRequestPut(context) {
    try {
        const asset = await load(context);
        if (!asset) return json({ ok: false, error: '文件不存在' }, 404);
        const body = await context.request.json();
        if (body.name !== undefined) {
            if (typeof body.name !== 'string' || !body.name.trim()) return json({ ok: false, error: '名称不能为空' }, 400);
            asset.name = body.name.trim();
        }
        if (body.description !== undefined) {
            if (typeof body.description !== 'string') return json({ ok: false, error: '简介格式错误' }, 400);
            asset.description = body.description;
        }
        if (body.tags !== undefined) {
            if (!Array.isArray(body.tags) || body.tags.some(t => typeof t !== 'string')) return json({ ok: false, error: '标签格式错误' }, 400);
            asset.tags = [...new Set(body.tags.map(t => t.trim()).filter(Boolean))];
        }
        if (body.favorited !== undefined) {
            if (typeof body.favorited !== 'boolean') return json({ ok: false, error: '收藏状态格式错误' }, 400);
            asset.favorited = body.favorited;
        }
        if (body.cardIds !== undefined) {
            if (!Array.isArray(body.cardIds) || body.cardIds.some(id => typeof id !== 'string')) return json({ ok: false, error: '关联格式错误' }, 400);
            const ids = [...new Set(body.cardIds)];
            for (const id of ids) {
                if (!(await context.env.CARDS_KV.get(`card:${id}`))) return json({ ok: false, error: `角色卡不存在: ${id}` }, 400);
            }
            asset.cardIds = ids;
        }
        await context.env.CARDS_KV.put(assetKey(asset.type, asset.id), JSON.stringify(asset));
        return json({ ok: true, data: asset });
    } catch (error) {
        return json({ ok: false, error: error.message }, 500);
    }
}

export async function onRequestDelete(context) {
    try {
        const asset = await load(context);
        if (!asset) return json({ ok: false, error: '文件不存在' }, 404);
        if (context.env.TG_BOT_TOKEN && context.env.TG_CHAT_ID && asset.telegramMessageId) {
            await deleteTelegramMessage(context.env.TG_BOT_TOKEN, context.env.TG_CHAT_ID, asset.telegramMessageId);
        }
        await context.env.CARDS_KV.delete(assetKey(asset.type, asset.id));
        return json({ ok: true });
    } catch (error) {
        return json({ ok: false, error: error.message }, 500);
    }
}
