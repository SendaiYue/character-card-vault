import { uploadToTelegram } from '../../utils/telegram.js';
import { ASSET_EXTENSIONS, assetKey, isAssetType, json, listRecords } from '../../utils/storage.js';

export async function onRequestGet(context) {
    try {
        const params = new URL(context.request.url).searchParams;
        const type = params.get('type');
        const cardId = params.get('cardId');
        if (type && !isAssetType(type)) return json({ ok: false, error: '无效的分类' }, 400);
        if (!type && !cardId) return json({ ok: false, error: '请选择分类' }, 400);

        let assets = await listRecords(context.env.CARDS_KV, type ? `asset:${type}:` : 'asset:');
        if (cardId) assets = assets.filter(a => (a.cardIds || []).includes(cardId));
        const tag = params.get('tag');
        const query = (params.get('q') || '').trim().toLocaleLowerCase();
        if (tag) assets = assets.filter(a => (a.tags || []).includes(tag));
        if (params.get('favorite') === 'true') assets = assets.filter(a => a.favorited);
        if (query) assets = assets.filter(a => [a.name, a.description, a.fileName, ...(a.tags || [])]
            .some(value => String(value || '').toLocaleLowerCase().includes(query)));
        if (params.get('sort') === 'az') assets.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'));
        else assets.sort((a, b) => params.get('sort') === 'old' ? a.importedAt - b.importedAt : b.importedAt - a.importedAt);

        const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(params.get('limit'), 10) || 30));
        return json({ ok: true, data: assets.slice((page - 1) * limit, page * limit), total: assets.length, page, limit });
    } catch (error) {
        return json({ ok: false, error: error.message }, 500);
    }
}

export async function onRequestPost(context) {
    try {
        const form = await context.request.formData();
        const type = form.get('type');
        const file = form.get('file');
        if (!isAssetType(type)) return json({ ok: false, error: '无效的分类' }, 400);
        if (!file || typeof file.name !== 'string') return json({ ok: false, error: '请选择文件' }, 400);
        const extension = file.name.split('.').pop().toLocaleLowerCase();
        if (!ASSET_EXTENSIONS.has(extension)) return json({ ok: false, error: '仅支持 JSON、TXT、JS、YAML、YML、ZIP' }, 400);
        if (file.size > 50 * 1024 * 1024) return json({ ok: false, error: '文件大小不能超过 50MB' }, 400);
        if (!context.env.TG_BOT_TOKEN || !context.env.TG_CHAT_ID) return json({ ok: false, error: 'Telegram 配置未设置' }, 500);

        const bytes = await file.arrayBuffer();
        const hash = await crypto.subtle.digest('SHA-256', bytes);
        const id = Array.from(new Uint8Array(hash)).map(n => n.toString(16).padStart(2, '0')).join('').slice(0, 16);
        const key = assetKey(type, id);
        if (await context.env.CARDS_KV.get(key)) return json({ ok: false, error: '该文件已存在于此分类' }, 409);
        const name = file.name.replace(/\.[^.]+$/, '').trim() || file.name;
        const uploaded = await uploadToTelegram(context.env.TG_BOT_TOKEN, context.env.TG_CHAT_ID, file, `${type}: ${name}`);
        const asset = {
            id, type, name, description: '', tags: [], favorited: false, cardIds: [],
            fileName: uploaded.fileName || file.name, fileSize: file.size,
            telegramFileId: uploaded.fileId, telegramMessageId: uploaded.messageId,
            importedAt: Date.now()
        };
        await context.env.CARDS_KV.put(key, JSON.stringify(asset));
        return json({ ok: true, data: asset });
    } catch (error) {
        return json({ ok: false, error: error.message }, 500);
    }
}
