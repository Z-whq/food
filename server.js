const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = 3000;

// Enable CORS for all origins (since this is a local dev server)
app.use(cors());
// Increase JSON payload limit to handle large base64 images
app.use(express.json({ limit: '10mb' }));

app.post('/api/llm', async (req, res) => {
    try {
        const { provider, apiKey, baseUrl, model, messages, useJson } = req.body;

        if (!apiKey) {
            return res.status(400).json({ error: 'API Key is required' });
        }

        const defaultUrls = {
            'openai': 'https://api.openai.com/v1/chat/completions',
            'gemini': 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            'qwen': 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            'deepseek': 'https://api.deepseek.com/v1/chat/completions'
        };

        let targetUrl = baseUrl;
        if (!targetUrl) {
            targetUrl = defaultUrls[provider] || defaultUrls['openai'];
        } else {
             if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl;
            }
            if (!targetUrl.endsWith('/chat/completions')) {
                targetUrl = targetUrl.replace(/\/$/, '') + '/chat/completions';
            }
        }

        const body = {
            model: model,
            messages: messages,
            temperature: 0.7
        };

        if (useJson && provider === 'openai') {
            body.response_format = { type: "json_object" };
        }

        console.log(`Forwarding request to: ${targetUrl} [Model: ${model}]`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`API Error (${response.status}):`, errText);
            return res.status(response.status).json({ error: `API 请求失败: ${response.status} ${errText}` });
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('Server Proxy Error:', error);
        res.status(500).json({ error: '后端代理服务出错: ' + error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend proxy server running at http://localhost:${port}`);
    console.log(`Send POST requests to http://localhost:${port}/api/llm`);
});