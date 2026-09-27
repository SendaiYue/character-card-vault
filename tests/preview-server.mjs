// Local, read-only fixture server for checking the static UI without Cloudflare credentials.
import http from 'node:http';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
    .replace('<script>', '<script>localStorage.setItem("token", "preview");</script><script>');
const cards = [{ id: 'demo', name: '示例角色', creator: '作者', importedAt: 1, tags: ['奇幻'],
    description: '用于检查界面布局的示例卡片。', favorited: false }];
const assets = [
    { id: 'world', type: 'worldbook', name: '晨雾大陆', fileName: 'world.json', description: '世界背景与设定', tags: ['奇幻'], cardIds: ['demo'], importedAt: 3, fileSize: 1024 },
    { id: 'preset', type: 'preset', name: '叙事预设', fileName: 'preset.json', description: '对话风格配置', tags: ['写作'], cardIds: [], importedAt: 2, fileSize: 2048 },
    { id: 'script', type: 'script', name: '文本处理脚本', fileName: 'script.js', description: '示例脚本文件', tags: ['工具'], cardIds: [], importedAt: 1, fileSize: 512 }
];

http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    response.setHeader('Content-Type', url.pathname.startsWith('/api/') ? 'application/json' : 'text/html; charset=utf-8');
    const send = value => response.end(JSON.stringify(value));
    if (url.pathname === '/api/config') return send({ ok: true, data: { siteName: '角色卡仓库', siteTitle: '预览' } });
    if (url.pathname === '/api/cards') return send({ ok: true, data: cards, total: cards.length, page: 1, limit: 30 });
    if (url.pathname === '/api/cards/demo') return send({ ok: true, data: cards[0] });
    if (url.pathname === '/api/tags') return send({ ok: true, data: ['奇幻'] });
    if (url.pathname === '/api/assets/tags') return send({ ok: true, data: assets.filter(a => a.type === url.searchParams.get('type')).flatMap(a => a.tags) });
    if (url.pathname === '/api/assets') {
        const data = assets.filter(a => (!url.searchParams.has('type') || a.type === url.searchParams.get('type')) &&
            (!url.searchParams.has('cardId') || a.cardIds.includes(url.searchParams.get('cardId'))));
        return send({ ok: true, data, total: data.length, page: 1, limit: 30 });
    }
    const match = url.pathname.match(/^\/api\/assets\/(worldbook|preset|script)\/([^/]+)$/);
    if (match) return send({ ok: true, data: assets.find(a => a.type === match[1] && a.id === match[2]) });
    response.end(html);
}).listen(8791, '127.0.0.1', () => console.log('preview at http://127.0.0.1:8791'));
