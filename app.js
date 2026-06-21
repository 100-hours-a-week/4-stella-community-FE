import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware'; // 추가

const app = express();

dotenv.config();

const port = 3000;

// 현재 파일의 URL에서 디렉토리 경로를 추출
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use('/v1', createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
    on: {
        error: (err, req, res) => {
            console.error('Proxy error:', err);
        }
    }
}));

app.use('/users', createProxyMiddleware({ target: 'http://localhost:8080' }));

app.use(express.static(__dirname));

app.get('/config.js', (req, res) => {
    const apiBaseUrl = process.env.API_BASE_URL || '';
    res.set('Cache-Control', 'no-store');
    res.type('application/javascript').send(
        `window.__APP_CONFIG__ = ${JSON.stringify({
            API_BASE_URL: apiBaseUrl,
        })};`,
    );
});

app.get('/', (req, res) => {
    res.redirect('/html/index.html');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
