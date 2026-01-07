const API_KEY = 'THJ41LL8XDMVWZLPN9MQOYN7FS17ZZEL';
const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

let currentEdits = [];

// টাইপ করা থামানোর ৮০০ মিলি-সেকেন্ড পর চেক করবে
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
                session_id: 'ospranto-session'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];

        // যদি কোনো ভুল থাকে তবে আন্ডারলাইন দেখাবে
        if (currentEdits.length > 0) {
            applyUnderlines();
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}

function applyUnderlines() {
    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;

    // ভুলগুলো সিরিয়াল অনুযায়ী সাজানো
    const sortedEdits = [...currentEdits].sort((a, b) => a.start - b.start);

    sortedEdits.forEach(edit => {
        // ভুলের আগের টেক্সট যোগ করা
        html += escapeHtml(text.substring(lastIndex, edit.start));
        
        // ভুল শব্দটিকে স্প্যান দিয়ে ঘিরে দেওয়া
        const errorWord = text.substring(edit.start, edit.end);
        html += `<span class="error-underline" data-replacement="${escapeHtml(edit.replacement || '')}">${escapeHtml(errorWord)}</span>`;
        
        lastIndex = edit.end;
    });

    // বাকি টেক্সটটুকু যোগ করা
    html += escapeHtml(text.substring(lastIndex));
    
    // এডিটরের এইচটিএমএল আপডেট করা
    editor.innerHTML = html;
    
    // কার্সার পজিশন ঠিক রাখা
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

// অটো ফিক্স বাটনের কাজ
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
    alert('সব ভুল ঠিক করে দেওয়া হয়েছে! ✨');
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
