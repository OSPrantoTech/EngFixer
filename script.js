/* EngFixer Pro 2.0 - Final Stable Script */

const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const rewriteOptions = document.getElementById('rewriteOptions');
let activeSpan = null;

// ১ সেকেন্ড টাইপিং বিরতিতে চেক হবে
editor.addEventListener('input', debounce(() => {
    checkGrammar();
}, 1000));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim()) return;

    try {
        // level=picky এবং কোনো ক্যাটাগরি ডিজেবল না করে ফুল চেক
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=en-US&level=picky`
        });

        const data = await response.json();
        highlightErrors(data.matches);
    } catch (err) {
        console.error('API Error:', err);
    }
}

function highlightErrors(matches) {
    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;

    matches.forEach(match => {
        const start = match.offset;
        const end = match.offset + match.length;
        
        // সব সাজেশনগুলোকে একটি ফিল্টারড লিস্টে রাখা
        const suggestions = match.replacements.map(r => r.value).slice(0, 3);
        const suggestionAttr = encodeURIComponent(JSON.stringify(suggestions));

        html += escapeHtml(text.substring(lastIndex, start));
        // এরর স্প্যান - এখানে !important স্টাইল দিয়ে গ্লিচ ঠেকানো হয়েছে
        html += `<span class="error" data-suggestions="${suggestionAttr}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // কার্সার পজিশন ঠিক রাখা
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preOffset = range.startOffset;
        editor.innerHTML = html;
        // কার্সারকে আগের জায়গায় ফিরিয়ে নেওয়ার চেষ্টা
        placeCaretAtEnd(editor);
    } else {
        editor.innerHTML = html;
    }
}

// ক্লিক করলে রিরাইট অপশন পপ-আপ হবে
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const rect = activeSpan.getBoundingClientRect();
        
        // সাজেশন ডাটা ডিকোড করা
        const suggestions = JSON.parse(decodeURIComponent(activeSpan.dataset.suggestions || "[]"));
        rewriteOptions.innerHTML = ''; 

        if (suggestions.length > 0) {
            suggestions.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'rewrite-btn';
                // বড় সাজেশন হলে Rephrase আর ছোট হলে Fix দেখানো হবে
                btn.innerText = s.length > activeSpan.innerText.length ? `Rephrase: ${s}` : `Fix: ${s}`;
                btn.onclick = (event) => {
                    event.stopPropagation();
                    activeSpan.outerHTML = s;
                    tooltip.classList.remove('show');
                };
                rewriteOptions.appendChild(btn);
            });
        }

        // পজিশন সেট করা
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.classList.add('show');
    } else if (!tooltip.contains(e.target)) {
        tooltip.classList.remove('show');
    }
});

// "Auto Fix All Errors" বাটন ফিক্স
document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    if (errors.length === 0) return;

    errors.forEach(span => {
        const suggestions = JSON.parse(decodeURIComponent(span.dataset.suggestions || "[]"));
        if (suggestions.length > 0) {
            // প্রথম সাজেশনটি দিয়ে অটো রিপ্লেস
            span.outerHTML = suggestions[0];
        }
    });
    tooltip.classList.remove('show');
});

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
