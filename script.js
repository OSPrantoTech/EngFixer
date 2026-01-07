// তোমার API Key সরাসরি এখানে দেওয়া হলো
const API_KEY = 'THJ41LL8XDMVWZLPN9MQOYN7FS17ZZEL';

const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

let currentEdits = [];

// টাইপ করা শেষ হওয়ার ৮০০ মিলিসেকেন্ড পর চেক করবে
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
                session_id: 'ospranto-checker'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];

        if (currentEdits.length > 0) {
            highlightErrors();
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}

function highlightErrors() {
    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;

    // এররগুলো ইনডেক্স অনুযায়ী সাজানো
    const sortedEdits = [...currentEdits].sort((a, b) => a.start - b.start);

    sortedEdits.forEach(edit => {
        const start = edit.start;
        const end = edit.end;
        const replacement = edit.replacement || '';

        // ভুলের আগের টেক্সট
        html += escapeHtml(text.substring(lastIndex, start));
        // ভুলের টেক্সট আন্ডারলাইনসহ
        html += `<span class="error-underline" data-replacement="${escapeHtml(replacement)}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    // বাকি টেক্সট
    html += escapeHtml(text.substring(lastIndex));
    
    // এডিটর আপডেট এবং কার্সার পজিশন ঠিক করা
    editor.innerHTML = html;
    placeCaretAtEnd(editor);
}

// কার্সারকে সবসময় টেক্সটের শেষে রাখার ফাংশন
function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// অটো ফিক্স বাটন লজিক
fixButton.addEventListener('click', () => {
    const underlines = document.querySelectorAll('.error-underline');
    
    if (underlines.length === 0) {
        alert('কোনো ভুল পাওয়া যায়নি! 🎉');
        return;
    }

    underlines.forEach(span => {
        const replacement = span.getAttribute('data-replacement');
        if (replacement) {
            span.outerHTML = replacement;
        }
    });

    currentEdits = [];
    alert('সবগুলো ভুল অটো-ফিক্স করা হয়েছে! ✨');
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}
