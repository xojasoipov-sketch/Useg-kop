// ── AI Router Route ───────────────────────────────────────────────
// Smart model selection + fallback chain
import { Hono } from 'hono';
import type { Env } from '../index';

export const aiRouter = new Hono<{ Bindings: Env }>();

interface Message { role: 'user' | 'assistant' | 'system'; content: string; }
interface AIRequest { messages: Message[]; model?: string; agent?: string; stream?: boolean; }

// Model routing logic
function selectModel(agent?: string, requestedModel?: string) {
  const agentModels: Record<string, string> = {
    coder:      'meta-llama/llama-3.3-70b-instruct:free',
    researcher: 'google/gemini-2.0-flash-exp:free',
    designer:   'meta-llama/llama-3.3-70b-instruct:free',
    planner:    'deepseek/deepseek-r1:free',
    security:   'deepseek/deepseek-r1:free',
    tester:     'meta-llama/llama-3.3-70b-instruct:free',
  };
  return requestedModel || agentModels[agent || ''] || 'meta-llama/llama-3.3-70b-instruct:free';
}

const AGENT_SYSTEMS: Record<string, string> = {
  master:     'You are the Master Agent. Orchestrate sub-agents to complete complex tasks. Plan first, then execute.',
  planner:    'You are the Planner Agent. Break complex tasks into actionable steps. Be specific and realistic.',
  researcher: 'You are the Research Agent. Find accurate information, best practices, and solutions. Cite sources.',
  coder:      'You are the Coding Agent. Write clean, efficient, production-ready code. Follow best practices.',
  designer:   'You are the UI Designer Agent. Create beautiful, Apple-level UIs. Mobile-first, pixel-perfect.',
  backend:    'You are the Backend Agent. Design scalable APIs, databases, and server-side logic.',
  tester:     'You are the Testing Agent. Write comprehensive tests: unit, integration, e2e.',
  security:   'You are the Security Agent. Find vulnerabilities, explain them clearly, provide fixes.',
  optimizer:  'You are the Optimization Agent. Improve performance, reduce bundle size, optimize algorithms.',
  deployer:   'You are the Deployment Agent. Handle CI/CD, Docker, cloud deployments.',
  docs:       'You are the Documentation Agent. Write clear, comprehensive documentation.',
  reviewer:   'You are the Code Review Agent. Review code quality, suggest improvements, find bugs.',
};

async function callProvider(provider: string, model: string, messages: Message[], env: Env) {
  const providers = [
    { name: 'openrouter', fn: () => callOpenRouter(env, model, messages) },
    { name: 'groq',       fn: () => callGroq(env, messages) },
    { name: 'pollinations', fn: () => callPollinations(messages) },
  ];

  const ordered = provider === 'groq'
    ? [providers[1], providers[0], providers[2]]
    : providers;

  for (const p of ordered) {
    try {
      const result = await p.fn();
      return { ...result, provider: p.name };
    } catch (e) {
      console.warn(`Provider ${p.name} failed:`, (e as Error).message);
    }
  }
  throw new Error('All AI providers failed');
}

async function callOpenRouter(env: Env, model: string, messages: Message[]) {
  const keys = [env.OPENROUTER_KEY_1, env.OPENROUTER_KEY_2, env.OPENROUTER_KEY_3, env.OPENROUTER_KEY_4].filter(Boolean);
  const key = keys[Math.floor(Math.random() * keys.length)];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': 'https://omnicode.app',
      'X-Title': 'OmniCode',
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });
  if (!res.ok) throw new Error(`OR ${res.status}`);
  const d: any = await res.json();
  return { text: d.choices[0].message.content, model };
}

async function callGroq(env: Env, messages: Message[]) {
  if (!env.GROQ_API_KEY) throw new Error('No Groq key');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 4096 }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}`);
  const d: any = await res.json();
  return { text: d.choices[0].message.content, model: 'llama-3.3-70b-versatile' };
}

async function callPollinations(messages: Message[]) {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai', messages }),
  });
  if (!res.ok) throw new Error(`Pollinations ${res.status}`);
  const d: any = await res.json();
  return { text: d.choices[0].message.content, model: 'openai' };
}

// POST /api/ai/chat
aiRouter.post('/chat', async (c) => {
  const body = await c.req.json<AIRequest>();
  const { messages, model: requestedModel, agent } = body;

  const systemPrompt = agent ? AGENT_SYSTEMS[agent] : 'You are OmniCode AI — a world-class coding assistant.';
  const selectedModel = selectModel(agent, requestedModel);

  const fullMessages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...messages.slice(-20),
  ];

  try {
    const result = await callProvider('openrouter', selectedModel, fullMessages, c.env);
    return c.json({ text: result.text, model: result.model, provider: result.provider });
  } catch (e) {
    return c.json({ error: (e as Error).message }, 500);
  }
});

// POST /api/ai/agent — Run multi-agent pipeline
aiRouter.post('/agent/run', async (c) => {
  const { task, agents = ['planner', 'coder', 'reviewer'] } = await c.req.json();

  const results: Record<string, string> = {};

  for (const agentName of agents) {
    const sys = AGENT_SYSTEMS[agentName] || 'You are an expert AI agent.';
    const prevContext = Object.entries(results)
      .map(([a, r]) => `[${a.toUpperCase()} OUTPUT]:\n${r}`)
      .join('\n\n');

    const messages: Message[] = [
      { role: 'system', content: sys },
      { role: 'user', content: prevContext ? `Task: ${task}\n\nPrevious agent outputs:\n${prevContext}\n\nNow complete your part.` : `Task: ${task}` },
    ];

    try {
      const result = await callProvider('openrouter', selectModel(agentName), messages, c.env);
      results[agentName] = result.text;
    } catch (e) {
      results[agentName] = `Error: ${(e as Error).message}`;
    }
  }

  return c.json({ results, agents });
});
