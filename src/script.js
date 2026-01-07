// Vercel/Netlify থেকে environment variable নিবে
const API_KEY = import.meta.env?.VITE_SAPLING_API_KEY || process.env.SAPLING_API_KEY || '';

const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

if (!API_KEY) {
    editor.innerHTML = '<p style="color:red; text-align:center;">Error: API key not found. Please set VITE_SAPLING_API_KEY in environment variables.</p>';
    fixButton.disabled = true;
}

let currentEdits = [];

editor.addEventListener('input', debounce(checkText, 800));

async function checkText() {
    const text = editor.innerText.trim();
    if (text.length === 0 || !API_KEY) {
        removeAllUnderlines();
        return;
    }

    try {
        const response = await fetch('https://api.sapling.ai/api/v1/edits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: API_KEY,
                text: text,
                session_id: 'ospranto-checker'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];

        removeAllUnderlines();

        if (currentEdits.length > 0) {
            let html = editor.innerHTML;
            const sortedEdits = [...currentEdits].sort((a, b) => b.start - a.start);

            for (const edit of sortedEdits) {
                const start = edit.start;
                const end = edit.end;
                const errorText = editor.innerText.substring(start, end);
                const replacement = edit.replacement || errorText;

                const span = `<span class="error-underline" data-replacement="${escapeHtml(replacement)}">${escapeHtml(errorText)}</span>`;
                html = html.substring(0, start) + span + html.substring(end);
            }
            editor.innerHTML = html;
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}

function removeAllUnderlines() {
    document.querySelectorAll('.error-underline').forEach(span => {
        span.outerHTML = span.innerHTML;
    });
}

fixButton.addEventListener('click', () => {
    if (currentEdits.length === 0) {
        alert('No errors found! Your writing is perfect! 🎉');
        return;
    }

    document.querySelectorAll('.error-underline').forEach(span => {
        const replacement = span.getAttribute('data-replacement');
        if (replacement) {
            span.outerHTML = replacement;
        }
    });

    currentEdits = [];
    alert('All errors fixed automatically! ✨');
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, delay) {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(func, delay);
    };
}
