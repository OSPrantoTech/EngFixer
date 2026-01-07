const API_KEY = 'THJ41LL8XDMVWZLPN9MQOYN7FS17ZZEL';
const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

let currentEdits = [];

// এক্সটেনশন খুললেই কার্সার এডিটরে যাবে
window.onload = () => editor.focus();

// ৮০০ মিলিসেকেন্ড পর চেক করবে যাতে টাইপ করার সময় ডিস্টার্ব না হয়
editor.addEventListener('input', debounce(() => {
    checkText();
}, 800));

async function checkText() {
    const text = editor.innerText.trim();
    if (text.length === 0) {
        currentEdits = [];
        return;
    }

    try {
        const response = await fetch('https://api.sapling.ai/api/v1/edits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: API_KEY,
                text: text,
                session_id: 'engfixer-session'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];
        applyHighlights();
    } catch (err) {
        console.error('API Error:', err);
    }
}

function applyHighlights() {
    const text = editor.innerText;
    if (currentEdits.length === 0) return;

    let html = '';
    let lastIndex = 0;

    // এডিটগুলো সাজিয়ে নেওয়া
    const sortedEdits = [...currentEdits].sort((a, b) => a.start - b.start);

    sortedEdits.forEach(edit => {
        const start = edit.start;
        const end = edit.end;
        const replacement = edit.replacement || '';

        html += escapeHtml(text.substring(lastIndex, start));
        // আন্ডারলাইন স্প্যান
        html += `<span class="error-underline" data-replacement="${escapeHtml(replacement)}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // সিলেকশন বা কার্সার পজিশন সেভ করা
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const offset = range.startOffset;

    editor.innerHTML = html;

    // কার্সারকে সঠিক জায়গায় ফিরিয়ে আনা
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
    if (underlines.length === 0) return;

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
