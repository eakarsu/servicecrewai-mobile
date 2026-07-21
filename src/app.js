'use strict';

const storageKey = 'servicecrewai.apiUrl';
const form = document.querySelector('#settings-form');
const input = document.querySelector('#api-url');
const status = document.querySelector('#status');
const healthCheck = document.querySelector('#health-check');

function configuredUrl() {
  return localStorage.getItem(storageKey) || '';
}

function normalizeHttpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('Use HTTPS (or localhost for development).');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

input.value = configuredUrl();

form.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    const value = normalizeHttpsUrl(input.value.trim());
    localStorage.setItem(storageKey, value);
    input.value = value;
    status.textContent = 'Service URL saved on this device. No credentials were stored.';
  } catch (error) {
    status.textContent = error.message;
  }
});

healthCheck.addEventListener('click', async () => {
  const baseUrl = configuredUrl();
  if (!baseUrl) {
    status.textContent = 'Configure a service URL first.';
    return;
  }

  status.textContent = 'Checking service…';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      credentials: 'omit',
      signal: controller.signal,
    });
    status.textContent = response.ok
      ? 'Service responded successfully.'
      : `Service returned HTTP ${response.status}.`;
  } catch (error) {
    status.textContent = error.name === 'AbortError'
      ? 'Service check timed out.'
      : 'Service could not be reached.';
  } finally {
    clearTimeout(timeout);
  }
});
