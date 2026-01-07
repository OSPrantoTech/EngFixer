/* EngFixer Pro 2.0.0 - Full Sentence Rewrite & Stability Fix */

const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const rewriteOptions = document.getElementById('rewriteOptions');
let activeSpan = null;

// টাইপিং বিরতিতে চেক করা
editor.addEventListener('input', debounce(() => {
    checkGrammar();
}, 1000));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim()) return;

    try {
        // level=picky পুরো বাক্য গঠন এবং স্টাইল সাজেশন নিয়ে আসে
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
        
        // সব সাজেশন এবং রিফ্রেজিং অপশনগুলো সংগ্রহ করা
        const suggestions = match.replacements.map(r => r.value).slice(0, 5); 
        const suggestionAttr = encodeURIComponent(JSON.stringify(suggestions));

        html += escapeHtml(text.substring(lastIndex, start));
        // গ্লিচ এড়াতে ইনলাইন স্প্যান ব্যবহার
        html += `<span class="error" data-suggestions="${suggestionAttr}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // এডিটর আপডেট করার সময় কার্সার হারানো রোধ করা
    const selection = window.getSelection();
    let range = null;
    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    }

    editor.innerHTML = html;
    
    if (range) {
        placeCaretAtEnd(editor);
    }
}

// ক্লিক করলে রিরাইট এবং সাজেশন পপ-আপ
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const rect = activeSpan.getBoundingClientRect();
        
        // সাজেশনের তালিকা ডিকোড করা
        const suggestions = JSON.parse(decodeURIComponent(activeSpan.dataset.suggestions || "[]"));
        rewriteOptions.innerHTML = ''; 

        if (suggestions.length > 0) {
            suggestions.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'rewrite-btn';
                
                // যদি সাজেশনে বড় বাক্য থাকে তবে 'Rewrite' দেখাবে
                const isSentence = s.split(' ').length > 2;
                btn.innerHTML = `<strong>${isSentence ? 'Rewrite' : 'Fix'}:</strong> ${s}`;
                
                btn.onclick = (event) => {
                    event.stopPropagation();
                    activeSpan.outerHTML = s;
                    tooltip.classList.remove('show');
                    checkGrammar(); // পরিবর্তনের পর আবার চেক
                };
                rewriteOptions.appendChild(btn);
            });
        }

        // টুলটিপ পজিশনিং
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;
        tooltip.classList.add('show');
    } else if (!tooltip.contains(e.target)) {
        tooltip.classList.remove('show');
    }
});

// এক ক্লিকে সব ফিক্স করা
document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    if (errors.length === 0) return;

    errors.forEach(span => {
        const suggestions = JSON.parse(decodeURIComponent(span.dataset.suggestions || "[]"));
        if (suggestions.length > 0) {
            span.outerHTML = suggestions[0];
        }
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
