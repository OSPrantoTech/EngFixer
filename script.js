const API_KEY = 'THJ41LL8XDMVWZLPN9MQOYN7FS17ZZEL';
const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

let currentEdits = [];

// ৮০০ মিলিসেকেন্ড পর চেক করবে
editor.addEventListener('input', debounce(() => {
    checkText();
}, 800));

async function checkText() {
    const text = editor.innerText.trim();
    
    // টেক্সট না থাকলে সব পরিষ্কার করে দেবে
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
                session_id: 'ospranto-session'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];

        // এরর থাকলে আন্ডারলাইন দেখাবে
        highlightErrors();
    } catch (err) {
        console.error('API Error:', err);
    }
}

function highlightErrors() {
    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;

    // এডিটগুলো স্টার্ট ইনডেক্স অনুযায়ী সাজানো
    const sortedEdits = [...currentEdits].sort((a, b) => a.start - b.start);

    sortedEdits.forEach(edit => {
        const start = edit.start;
        const end = edit.end;
        const replacement = edit.replacement || '';

        // ভুলের আগের অংশ যোগ করা
        html += escapeHtml(text.substring(lastIndex, start));
        // ভুল শব্দটিকে স্প্যান দিয়ে ঘিরে দেওয়া
        html += `<span class="error-underline" data-replacement="${escapeHtml(replacement)}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    // বাকি অংশ যোগ করা
    html += escapeHtml(text.substring(lastIndex));
    
    // শুধুমাত্র তখনই আপডেট করবে যদি পরিবর্তন থাকে
    if (currentEdits.length > 0) {
        editor.innerHTML = html;
        placeCaretAtEnd(editor); // কার্সার শেষে নিয়ে যাবে
    }
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
    if (underlines.length === 0) {
        alert('অসাধারণ! কোনো ভুল নেই। 🎉');
        return;
    }

    underlines.forEach(span => {
        const replacement = span.getAttribute('data-replacement');
        if (replacement) {
            span.outerHTML = replacement;
        }
    });
    
    currentEdits = [];
    alert('সব ভুল ঠিক করা হয়েছে! ✨');
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
