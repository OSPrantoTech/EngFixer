/* EngFixer Pro 2.0 - Final Script with Glitch Fix */

const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltipText');
const rewriteOptions = document.getElementById('rewriteOptions');
let activeSpan = null;

// টাইপিং ডিলে ১ সেকেন্ড করা হয়েছে যেন ইউজার টাইপ করার সময় বারবার আপডেট না হয়
editor.addEventListener('input', debounce(() => {
    checkGrammar();
}, 1000));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim()) return;

    try {
        // 'level=picky' যুক্ত করা হয়েছে রিরাইটিং এবং ভার্ব সমস্যা ধরার জন্য
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
        
        // সব সাজেশনের প্রথম ৩টি রিরাইট অপশন হিসেবে নেওয়া হচ্ছে
        const suggestions = JSON.stringify(match.replacements.slice(0, 3));

        html += escapeHtml(text.substring(lastIndex, start));
        // গ্লিচ এড়াতে স্প্যানকে কোনো বাড়তি স্পেস ছাড়া বসানো হয়েছে
        html += `<span class="error" data-all-suggest='${escapeHtml(suggestions)}'>${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // এডিটরের কন্টেন্ট আপডেট করার সময় কার্সার পজিশন ঠিক রাখা
    editor.innerHTML = html;
    placeCaretAtEnd(editor);
}

// মাউস ক্লিকে রিরাইট অপশন দেখানো
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const rect = activeSpan.getBoundingClientRect();
        
        const suggestions = JSON.parse(activeSpan.dataset.allSuggest || "[]");
        rewriteOptions.innerHTML = ''; 

        if (suggestions.length > 0) {
            suggestions.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'rewrite-btn';
                // বড় সাজেশন হলে 'Rewrite' আর ছোট হলে 'Fix' লেবেল দেওয়া
                const label = s.value.includes(' ') ? "Rewrite: " : "Fix: ";
                btn.innerText = `${label}${s.value}`;
                btn.onclick = (event) => {
                    event.stopPropagation();
                    activeSpan.outerHTML = s.value;
                    tooltip.classList.remove('show');
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

// এক ক্লিকে সব ভুল ঠিক করা
document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    errors.forEach(span => {
        const suggestions = JSON.parse(span.dataset.allSuggest || "[]");
        if (suggestions.length > 0) {
            span.outerHTML = suggestions[0].value;
        }
    });
    tooltip.classList.remove('show');
});

// কার্সার হ্যান্ডলিং ফাংশন
function placeCaretAtEnd(el) {
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

// HTML টেক্সট যেন কোড হিসেবে রান না করে
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// টাইপিংয়ের সময় পারফরম্যান্স ঠিক রাখার জন্য ডিবউন্স
function debounce(func, delay) {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(func, delay);
    };
}
