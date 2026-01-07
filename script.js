const API_KEY = 'THJ41LL8XDMVWZLPN9MQOYN7FS17ZZEL';
const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

let currentEdits = [];

// এক্সটেনশন খুললেই এডিটরে ফোকাস হবে
window.onload = () => editor.focus();

editor.addEventListener('input', debounce(() => {
    checkText();
}, 800));

async function checkText() {
    const text = editor.innerText.trim();
    if (text.length === 0) return;

    try {
        const response = await fetch('https://api.sapling.ai/api/v1/edits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: API_KEY,
                text: text,
                session_id: 'extension-session'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];
        highlightErrors();
    } catch (err) {
        console.error('API Error:', err);
    }
}

function highlightErrors() {
    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;
    const sortedEdits = [...currentEdits].sort((a, b) => a.start - b.start);

    sortedEdits.forEach(edit => {
        html += escapeHtml(text.substring(lastIndex, edit.start));
        html += `<span class="error-underline" data-replacement="${escapeHtml(edit.replacement || '')}">${escapeHtml(text.substring(edit.start, edit.end))}</span>`;
        lastIndex = edit.end;
    });

    html += escapeHtml(text.substring(lastIndex));
    editor.innerHTML = html;
    placeCaretAtEnd(editor);
}

function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

fixButton.addEventListener('click', () => {
    const underlines = document.querySelectorAll('.error-underline');
    underlines.forEach(span => {
        const replacement = span.getAttribute('data-replacement');
        if (replacement) span.outerHTML = replacement;
    });
    currentEdits = [];
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
