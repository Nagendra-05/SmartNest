// Change this address if your backend runs on another host or port.
const API_URL = "http://localhost:5000/api";



const $ = id => document.getElementById(id);


const escapeHTML = value =>
    String(value ?? "").replace(
        /[&<>"']/g,
        ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[ch])
    );


function getUser() {

    try {
        return JSON.parse(localStorage.getItem("user"));
    } catch {
        return null;
    }

}


function notice(id, text, error = false) {

    const el = $(id);

    if (el) {
        el.textContent = text;
        el.classList.toggle("error", error);
    }

}


function empty(text) {

    return `<div class="empty">${escapeHTML(text)}</div>`;

}


function badge(value) {

    return `
        <span class="badge ${String(value ?? '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')}">
            ${escapeHTML(value || 'Not specified')}
        </span>
    `;

}


function formatDate(value) {

    if (!value) return '—';

    const d = new Date(value);

    return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

}


async function api(path, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        15000
    );


    try {

        const token = localStorage.getItem('token');

        const response = await fetch(
            API_URL + path,
            {
                ...options,
                signal: controller.signal,
                headers: {
                    ...(options.body
                        ? { 'Content-Type': 'application/json' }
                        : {}
                    ),

                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {}
                    ),

                    ...options.headers
                }
            }
        );


        const type = response.headers.get('content-type') || '';


        if (!type.includes('json')) {
            throw new Error(
                `Server returned ${response.status}. Check the API route and backend.`
            );
        }


        const data = await response.json();


        if (!response.ok) {
            throw new Error(
                data.message || `Request failed (${response.status})`
            );
        }


        return data;


    } catch (e) {

        if (e.name === 'AbortError') {
            throw new Error(
                'The server took too long to respond. Please try again.'
            );
        }


        if (e instanceof TypeError) {
            throw new Error(
                'Cannot connect to the server. Check that your backend is running.'
            );
        }


        throw e;


    } finally {

        clearTimeout(timeout);

    }

}


async function loadList(path, id, render) {

    $(id).innerHTML = empty('Loading…');


    try {

        const data = await api(path);


        if (!Array.isArray(data)) {
            throw new Error('Unexpected server response.');
        }


        $(id).innerHTML = data.length
            ? data.map(render).join('')
            : empty('Nothing here yet.');


    } catch (e) {

        $(id).innerHTML = empty(e.message);

    }

}


async function submitAction(messageId, work) {

    const forms = [
        ...document.querySelectorAll('form')
    ];


    const form = forms.find(
        f => f.contains($(messageId))
    );


    const buttons = form
        ? [...form.querySelectorAll('button[type="submit"]')]
        : [];


    if (buttons.some(b => b.disabled)) return;


    buttons.forEach(
        b => b.disabled = true
    );


    notice(messageId, 'Saving…');


    try {

        await work();


    } catch (e) {

        notice(
            messageId,
            e.message,
            true
        );


    } finally {

        buttons.forEach(
            b => b.disabled = false
        );

    }

}


function togglePassword(button) {

    const input = $('password');


    input.type =
        input.type === 'password'
            ? 'text'
            : 'password';


    button.textContent =
        input.type === 'password'
            ? 'Show password'
            : 'Hide password';


    button.setAttribute(
        'aria-pressed',
        String(input.type === 'text')
    );

}