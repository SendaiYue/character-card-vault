import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost as uploadAsset, onRequestGet as listAssets } from '../functions/api/assets/index.js';
import { onRequestPut as updateAsset } from '../functions/api/assets/[type]/[id].js';
import { onRequestGet as downloadAsset } from '../functions/api/assets/[type]/[id]/download.js';
import { onRequestPut as updateCard, onRequestDelete as deleteCard } from '../functions/api/cards/[id].js';
import { onRequestGet as downloadCard } from '../functions/api/cards/[id]/download.js';
import { onRequestPost as exportAll } from '../functions/api/export/all.js';
import { onRequestPost as exportBatch } from '../functions/api/export/batch.js';
import { onRequestPost as restore } from '../functions/api/import/index.js';

function mockKV(pageSize = 2) {
    const data = new Map();
    return {
        data,
        async get(key, options) {
            const value = data.get(key);
            return value && options?.type === 'json' ? JSON.parse(value) : value ?? null;
        },
        async put(key, value) { data.set(key, value); },
        async delete(key) { data.delete(key); },
        async list({ prefix, cursor }) {
            const keys = [...data.keys()].filter(key => key.startsWith(prefix)).sort();
            const start = Number(cursor || 0);
            const slice = keys.slice(start, start + pageSize);
            return { keys: slice.map(name => ({ name })), list_complete: start + pageSize >= keys.length,
                cursor: String(start + pageSize) };
        }
    };
}

function context(kv, url, body, params = {}) {
    return {
        env: { CARDS_KV: kv, TG_BOT_TOKEN: 'test-token', TG_CHAT_ID: '-1001' },
        request: { url, json: async () => body, formData: async () => body }, params
    };
}

async function result(response) { return response.json(); }

test('asset upload, metadata, associations, original download and card rename', async () => {
    const kv = mockKV();
    kv.data.set('card:abc', JSON.stringify({ id: 'abc', name: '旧名', tags: [], importedAt: 1, telegramFileName: 'old.json' }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        if (String(url).includes('/sendDocument')) return Response.json({ ok: true, result: {
            document: { file_id: 'file1', file_name: 'world.json' }, message_id: 10
        } });
        if (String(url).includes('/getFile')) return Response.json({ ok: true, result: { file_path: 'path' } });
        if (String(url).includes('/file/bot')) return new Response('original bytes');
        throw new Error(`unexpected fetch: ${url}`);
    };
    try {
        const file = new File(['original bytes'], 'world.json', { type: 'application/json' });
        const form = new FormData();
        form.set('type', 'worldbook'); form.set('file', file);
        const uploaded = await result(await uploadAsset(context(kv, 'https://site/api/assets', form)));
        assert.equal(uploaded.ok, true);
        const id = uploaded.data.id;
        const changed = await result(await updateAsset(context(kv, '', {
            name: '世界设定', description: '简介', tags: ['魔法'], cardIds: ['abc']
        }, { type: 'worldbook', id })));
        assert.equal(changed.data.cardIds[0], 'abc');
        assert.equal(changed.data.name, '世界设定');
        const list = await result(await listAssets(context(kv, 'https://site/api/assets?type=worldbook&q=魔法', null)));
        assert.equal(list.total, 1);
        const download = await downloadAsset(context(kv, '', null, { type: 'worldbook', id }));
        assert.equal(await download.text(), 'original bytes');
        assert.match(download.headers.get('Content-Disposition'), /world.json/);

        const emptyName = await updateCard(context(kv, '', { name: ' ' }, { id: 'abc' }));
        assert.equal(emptyName.status, 400);
        await updateCard(context(kv, '', { name: '新名字' }, { id: 'abc' }));
        assert.equal((await kv.get('card:abc', { type: 'json' })).name, '新名字');
        assert.equal((await kv.get(`asset:worldbook:${id}`, { type: 'json' })).fileName, 'world.json');
        const card = await kv.get('card:abc', { type: 'json' });
        card.telegramFileId = 'file1';
        await kv.put('card:abc', JSON.stringify(card));
        const cardFile = await downloadCard(context(kv, '', null, { id: 'abc' }));
        assert.match(cardFile.headers.get('Content-Disposition'), /%E6%96%B0%E5%90%8D%E5%AD%97\.json/);
        assert.equal(await cardFile.text(), 'original bytes');
    } finally { globalThis.fetch = originalFetch; }
});

test('all backups follow KV pagination; deleting a card clears links', async () => {
    const kv = mockKV(2);
    for (let i = 0; i < 5; i++) kv.data.set(`card:c${i}`, JSON.stringify({ id: `c${i}`, name: `卡${i}`, importedAt: i }));
    kv.data.set('asset:script:a', JSON.stringify({ id: 'a', type: 'script', name: '脚本', cardIds: ['c4'] }));
    const backup = await result(await exportAll(context(kv, '', null)));
    assert.equal(backup.data.cards.length, 5);
    assert.equal(backup.data.assets.length, 1);
    await deleteCard(context(kv, '', null, { id: 'c4' }));
    assert.deepEqual((await kv.get('asset:script:a', { type: 'json' })).cardIds, []);
});

test('batch export and restore carry asset file bytes; old backups still restore', async () => {
    const kv = mockKV();
    kv.data.set('asset:preset:x', JSON.stringify({ id: 'x', type: 'preset', name: '预设', fileName: 'p.txt',
        telegramFileId: 'old', cardIds: ['c1'], tags: ['常用'], importedAt: 1 }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async url => {
        if (String(url).includes('/getFile')) return Response.json({ ok: true, result: { file_path: 'path' } });
        if (String(url).includes('/file/bot')) return new Response('file bytes');
        if (String(url).includes('/sendDocument')) return Response.json({ ok: true, result: {
            document: { file_id: 'new', file_name: 'p.txt' }, message_id: 21
        } });
        throw new Error(`unexpected fetch: ${url}`);
    };
    try {
        const batch = await result(await exportBatch(context(kv, '', { assetRefs: [{ type: 'preset', id: 'x' }] })));
        assert.equal(batch.data.assets[0].fileData.length, 10);
        const destination = mockKV();
        const old = await result(await restore(context(destination, '', { cards: [{ id: 'c1', name: '卡1' }] })));
        assert.equal(old.data.importedCards, 1);
        const imported = await result(await restore(context(destination, '', batch.data)));
        assert.equal(imported.data.importedAssets, 1);
        const asset = await destination.get('asset:preset:x', { type: 'json' });
        assert.equal(asset.telegramFileId, 'new');
        assert.deepEqual(asset.cardIds, ['c1']);
        assert.equal(asset.fileData, undefined);
    } finally { globalThis.fetch = originalFetch; }
});

test('asset file types and size are validated before Telegram upload', async () => {
    const kv = mockKV();
    const badType = await uploadAsset(context(kv, '', new Map([['type', 'script'], ['file', { name: 'x.exe', size: 1 }]])));
    assert.equal(badType.status, 400);
    const tooLarge = await uploadAsset(context(kv, '', new Map([['type', 'script'], ['file', { name: 'x.js', size: 51 * 1024 * 1024 }]])));
    assert.equal(tooLarge.status, 400);
});

test('all three asset categories accept their expected file types', async () => {
    const kv = mockKV();
    const originalFetch = globalThis.fetch;
    let messageId = 0;
    globalThis.fetch = async () => Response.json({ ok: true, result: {
        document: { file_id: `file-${++messageId}`, file_name: 'saved' }, message_id: messageId
    } });
    try {
        for (const [type, name] of [['worldbook', 'world.yaml'], ['preset', 'preset.txt'], ['script', 'script.js']]) {
            const form = new FormData();
            form.set('type', type);
            form.set('file', new File([type], name));
            const response = await uploadAsset(context(kv, '', form));
            assert.equal(response.status, 200, type);
            const asset = (await result(response)).data;
            assert.equal(asset.type, type);
        }
    } finally { globalThis.fetch = originalFetch; }
});
