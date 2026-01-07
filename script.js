/* EngFixer Pro 2.0 - Full Logic */

const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltipText');
const rewriteOptions = document.getElementById('rewriteOptions');
const applySuggest = document.getElementById('applySuggest');
let activeSpan = null;

// টাইপ করার সময় গ্রামার চেক
editor.addEventListener('input', debounce(() => {
    checkGrammar();
}, 1200));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim()) return;

    try {
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=en-US`
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
        
        // সব সাজেশনগুলোকে একটি স্ট্রিং হিসেবে সেভ করা
        const suggestions = JSON.stringify(match.replacements.slice(0, 3));

        html += escapeHtml(text.substring(lastIndex, start));
        html += `<span class="error" data-all-suggest='${suggestions}'>${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // কার্সার পজিশন ঠিক রেখে আপডেট
    const selection = window.getSelection();
    let offset = 0;
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        offset = range.startOffset;
    }

    editor.innerHTML = html;
    placeCaretAtEnd(editor);
}

// ক্লিক করলে রিরাইট পপ-আপ দেখানো
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const rect = activeSpan.getBoundingClientRect();
        
        // সাজেশন বাটন তৈরি করা
        const suggestions = JSON.parse(activeSpan.dataset.allSuggest || "[]");
        rewriteOptions.innerHTML = ''; 

        suggestions.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'rewrite-btn';
            btn.innerText = `Rewrite: "${s.value}"`;
            btn.onclick = (event) => {
                event.stopPropagation();
                activeSpan.outerHTML = s.value;
                tooltip.classList.remove('show');
            };
            rewriteOptions.appendChild(btn);
        });

        tooltipText.innerText = suggestions.length > 0 ? "Choose a better way:" : "No rewrites found.";
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.classList.add('show');
    } else if (!tooltip.contains(e.target)) {
        tooltip.classList.remove('show');
    }
});

// মেইন ফিক্স বাটন
document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    errors.forEach(span => {
        const suggestions = JSON.parse(span.dataset.allSuggest || "[]");
        if (suggestions.length > 0) span.outerHTML = suggestions[0].value;
    });
    tooltip.classList.remove('show');
});

function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
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
