import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { callClaude } from '../utils';
import SaveToLibrary from '../SaveToLibrary';

const mdComponents = {
  h1: ({ children }) => <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 400, color: '#1C1A18', margin: '20px 0 8px' }}>{children}</h1>,
  h2: ({ children }) => <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 400, color: '#1C1A18', margin: '18px 0 6px' }}>{children}</h2>,
  h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1C1A18', margin: '14px 0 4px' }}>{children}</h3>,
  p: ({ children }) => <p style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.7, margin: '0 0 10px' }}>{children}</p>,
  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '0 0 10px' }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ paddingLeft: 20, margin: '0 0 10px' }}>{children}</ol>,
  li: ({ children }) => <li style={{ fontSize: 14, color: '#1C1A18', lineHeight: 1.7, marginBottom: 4 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 700, color: '#1C1A18' }}>{children}</strong>,
  em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(201,191,168,0.38)', margin: '16px 0' }} />,
};

const QUICK_FILL = [
  {
    label: 'Caption',
    prompt: (brand) =>
      `Write a compelling Instagram caption for ${brand.name}, a ${brand.niche} creator. The caption should feel authentic to the brand voice, include a strong hook in the first line, and end with a call to action. Include relevant hashtags at the end.`,
  },
  {
    label: 'Image Prompt',
    prompt: (brand) =>
      `Write a detailed AI image generation prompt for ${brand.name}, a ${brand.niche} virtual influencer. The prompt should describe the visual aesthetic, lighting, pose, and setting. Format it for use in tools like Midjourney or OpenArt AI.`,
  },
  {
    label: 'Hooks',
    prompt: (brand) =>
      `Write 10 high-performing Instagram hook variations for ${brand.name}, a ${brand.niche} creator. Each hook should be the first line of a caption that stops the scroll. Vary the style: question, bold statement, story opener, number list, controversy, transformation.`,
  },
  {
    label: 'Bio',
    prompt: (brand) =>
      `Write 3 Instagram bio variations for ${brand.name}, a ${brand.niche} creator. Each bio should be under 150 characters, communicate the unique value proposition, and include a personality that fits the ${brand.niche} space. Include an emoji option and a clean text option for each.`,
  },
  {
    label: 'Content Calendar',
    prompt: (brand) =>
      `Create a 7-day Instagram content calendar for ${brand.name}, a ${brand.niche} creator. For each day, include: format (Reel/Carousel/Static), content pillar, hook idea, and best posting time. Make it realistic and varied.`,
  },
  {
    label: 'Persona',
    prompt: (brand) =>
      `Develop a detailed persona and backstory for ${brand.name}, a ${brand.niche} virtual influencer. Include: origin story, personality traits, values, aesthetic preferences, target audience, content style, brand voice, and three signature content series ideas. Make it rich and specific.`,
  },
];

export default function StudioTab({ brand, showToast, initialPrompt }) {
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt) return;
    if (!brand.anthropicKey) { showToast('Anthropic key missing -- add it in your dashboard', 'error'); return; }
    setLoading(true);
    setOutput('');
    try {
      const result = await callClaude(brand.anthropicKey, [{ role: 'user', content: prompt }], 1000);
      setOutput(result);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => showToast('Copied to clipboard'));
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1A18', marginBottom: 10 }}>Quick fill</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {QUICK_FILL.map(qf => (
            <button key={qf.label} onClick={() => setPrompt(qf.prompt(brand))} style={{
              padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              background: 'transparent', border: '1px solid rgba(201,191,168,0.38)',
              color: '#1C1A18', fontFamily: 'DM Sans, sans-serif',
              transition: 'border-color 0.15s, background 0.15s',
            }}>
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#1C1A18', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={6}
          placeholder="Describe what you want Claude to write for you..."
          style={{
            width: '100%', padding: '12px 14px', background: '#FDFAF5',
            border: '1px solid rgba(201,191,168,0.38)', borderRadius: 10,
            fontSize: 14, color: '#1C1A18', fontFamily: 'DM Sans, sans-serif',
            boxSizing: 'border-box', outline: 'none', resize: 'vertical', lineHeight: 1.6,
          }}
        />
      </div>

      <button onClick={generate} disabled={loading || !prompt} style={{
        padding: '11px 24px', background: brand.accent, color: '#fff',
        border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
        cursor: loading || !prompt ? 'not-allowed' : 'pointer',
        fontFamily: 'DM Sans, sans-serif', opacity: loading || !prompt ? 0.65 : 1,
        marginBottom: 24,
      }}>
        {loading ? 'Generating...' : 'Generate'}
      </button>

      {output && (
        <div style={{ background: '#FDFAF5', border: '1px solid rgba(201,191,168,0.38)', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1A18' }}>Output</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <SaveToLibrary content={output} accent={brand.accent} onSaved={() => showToast('Saved to Library')} />
              <button onClick={copy} style={{
                padding: '6px 14px', background: 'transparent',
                border: '1px solid rgba(201,191,168,0.38)', borderRadius: 6,
                fontSize: 12, cursor: 'pointer', color: '#1C1A18',
                fontFamily: 'DM Sans, sans-serif',
              }}>Copy</button>
            </div>
          </div>
          <ReactMarkdown components={mdComponents}>{output}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
