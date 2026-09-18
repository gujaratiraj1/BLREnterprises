document.addEventListener('DOMContentLoaded', () => {
  const config = window.BLR_CONFIG || {};
  const panel = document.getElementById('service-assistant');
  if (!panel || config.assistantEnabled !== true || !config.assistantEndpoint) return;
  panel.hidden = false;
  const form = document.getElementById('assistant-form');
  const question = document.getElementById('assistant-question');
  const reply = document.getElementById('assistant-reply');
  const submit = document.getElementById('assistant-submit');
  const handoff = document.getElementById('assistant-handoff');
  let lastQuestion = '';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    lastQuestion = question.value.trim();
    if (!lastQuestion) { question.focus(); return; }
    submit.disabled = true;
    submit.textContent = 'Thinking…';
    reply.textContent = 'Preparing an answer…';
    reply.setAttribute('aria-busy', 'true');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(config.assistantEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: lastQuestion }), signal: controller.signal,
        credentials: 'omit'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The assistant is unavailable. Please contact our team.');
      if (typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('Please contact our team for help.');
      reply.textContent = data.answer;
    } catch (error) {
      reply.textContent = error.name === 'AbortError'
        ? 'The answer is taking too long. Please try again or contact our team.'
        : (error instanceof TypeError || error instanceof SyntaxError
          ? 'Unable to reach the assistant. Please try again or contact our team.' : error.message);
    } finally {
      clearTimeout(timer);
      reply.setAttribute('aria-busy', 'false');
      submit.disabled = false;
      submit.textContent = 'Ask about our services';
    }
  });
  handoff.addEventListener('click', () => {
    const target = document.getElementById('form-message');
    const draft = question.value.trim() || lastQuestion;
    if (draft && !target.value.includes(draft)) {
      target.value = [target.value.trim(), draft].filter(Boolean).join('\n\n');
    }
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    target.focus({ preventScroll: true });
  });
});
