/* EngFixer Pro 2.0.0 - Ultimate Stable Script */

const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const rewriteOptions = document.getElementById('rewriteOptions');
let activeSpan = null;

// টাইপিংয়ের সময় চেক করার ডিলে কমানো হয়েছে
editor.addEventListener('input', debounce(() => checkGrammar(), 600));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim() || text.length < 3) return;

    try {
        // API কল করার সময় level=picky এবং style চেক এনাবল করা হয়েছে
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=en-US&level=picky`
        });

        const data = await response.json();
        renderMatches(data.matches);
    } catch (err) {
        console.error('API Error:', err);
    }
}

function renderMatches(matches) {
    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;

    // সর্টিং করা হয়েছে যেন পজিশন ঠিক থাকে
    matches.sort((a, b) => a.offset - b.offset);

    matches.forEach(match => {
        const start = match.offset;
        const end = match.offset + match.length;
        
        // সব সাজেশনগুলোকে একটি লিস্টে নেওয়া
        const suggestions = match.replacements.map(r => r.value).slice(0, 5);
        const suggestionData = encodeURIComponent(JSON.stringify(suggestions));

        html += escapeHtml(text.substring(lastIndex, start));
        // ইনলাইন ডিসপ্লে এবং সলিড আন্ডারলাইন দিয়ে গ্লিচ ফিক্স
        html += `<span class="error" data-suggest="${suggestionData}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // কার্সার পজিশন সেভ ও রিস্টোর
    const selection = window.getSelection();
    let offset = 0;
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        offset = range.startOffset;
    }

    editor.innerHTML = html;
    restoreCaret(editor);
}

// ক্লিক করলে টুলটিপ এবং রিরাইট বাটন দেখানো
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const rect = activeSpan.getBoundingClientRect();
        
        const suggestions = JSON.parse(decodeURIComponent(activeSpan.dataset.suggest || "[]"));
        rewriteOptions.innerHTML = ''; 

        if (suggestions.length > 0) {
            suggestions.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'rewrite-btn';
                // বড় সাজেশন হলে "Rewrite" লেবেল দেওয়া
                const label = s.includes(' ') || s.length > activeSpan.innerText.length ? 'Rewrite' : 'Fix';
                btn.innerHTML = `<strong>${label}:</strong> ${s}`;
                
                btn.onclick = (event) => {
                    event.stopPropagation();
                    activeSpan.outerHTML = s;
                    tooltip.classList.remove('show');
                    checkGrammar(); // পরিবর্তনের পর আবার চেক
                };
                rewriteOptions.appendChild(btn);
            });
        }

        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
        tooltip.classList.add('show');
    } else if (!tooltip.contains(e.target)) {
        tooltip.classList.remove('show');
    }
});

// Auto Fix All বাটন লজিক
document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    if (errors.length === 0) return;

    errors.forEach(span => {
        const suggestions = JSON.parse(decodeURIComponent(span.dataset.suggest || "[]"));
        if (suggestions.length > 0) span.outerHTML = suggestions[0];
    });
    tooltip.classList.remove('show');
});

function restoreCaret(el) {
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
