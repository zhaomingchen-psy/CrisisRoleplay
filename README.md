# CrisisRoleplay (Role Play Only)

This project is a simplified clone of `SuicideEducation` that keeps only the AI client role-play flow.
It now supports switching model provider in UI: `GLM`, `Qwen`, `DeepSeek`, `Gemini`, `ChatGPT`.

Removed modules:
- round feedback
- full session report
- draft polish
- coaching/skill scoring panels

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
Connection diagnostics page: `http://localhost:3000/connection-test`.

## Environment

Create `.env.local` from `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Set the API keys for the providers you want to use:

```env
BIGMODEL_API_KEY=your_glm_api_key
BIGMODEL_MODEL=GLM-4.7-FlashX
BIGMODEL_BASE_URL=https://open.bigmodel.cn

OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1

DEEPSEEK_API_KEY=your_deepseek_key
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

QWEN_API_KEY=your_qwen_key
QWEN_MODEL=qwen-flash
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## API

- `POST /api/roleplay`: returns the next client reply for the current conversation.
- `POST /api/connection-test`: tests provider connectivity (all or one provider).
