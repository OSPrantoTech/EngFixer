const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltipText');
const rewriteOptions = document.getElementById('rewriteOptions');
let activeSpan = null;

// টাইপ করার সময় চেক (দেরি কমানো হয়েছে)
editor.addEventListener('input', debounce(() => {
    checkGrammar();
}, 1000));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim()) return;

    try {
        // level=picky : এটি রিরাইটিং এবং স্টাইল সাজেশন দেয়
        // language=en-US : আমেরিকান ইংরেজি স্ট্যান্ডার্ড
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=en-US&level=picky` 
        });

        const data = await response.json();
        // ক্যাপিটালাইজেশন এবং ভার্ব এররগুলোকে প্রাধান্য দেওয়া হবে
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
        const errorText = text.substring(start, end);
        
        // সব সাজেশন নিয়ে আসা
        const suggestions = match.replacements.slice(0, 4); // টপ ৪টা সাজেশন
        const suggestData = JSON.stringify(suggestions);
        
        // এররের ধরন বোঝা (Grammar vs Style)
        let errorType = match.rule.issueType; // grammar, style, misspelling
        
        html += escapeHtml(text.substring(lastIndex, start));
        
        // হাইলাইট স্প্যান তৈরি
        html += `<span class="error" 
                      data-type="${errorType}" 
                      data-suggestions='${escapeHtml(suggestData)}'>
                      ${escapeHtml(errorText)}
                 </span>`;
                 
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    // কার্সার পজিশন ঠিক রাখা
    const selection = window.getSelection();
    let offset = 0;
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        offset = range.startOffset;
    }

    editor.innerHTML = html;
    placeCaretAtEnd(editor);
}

// ক্লিক করলে পপ-আপ লজিক
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const suggestions = JSON.parse(activeSpan.dataset.suggestions || "[]");
        const errorType = activeSpan.dataset.type;

        // টুলটিপ হেডার সেট করা
        let headerText = "Suggestion";
        if (errorType === 'grammar') headerText = "Fix Grammar & Verbs";
        else if (errorType === 'style') headerText = "Rephrase / Style";
        else if (errorType === 'misspelling') headerText = "Spelling Correction";

        document.querySelector('.tooltip-header').innerText = headerText;
        
        // রিরাইট বাটন তৈরি
        rewriteOptions.innerHTML = '';
        if (suggestions.length > 0) {
            tooltipText.style.display = 'none'; // ডিফল্ট টেক্সট হাইড
            suggestions.forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'rewrite-btn';
                // যদি পুরো বাক্য বদলায় তাহলে 'Rephrase' আর শব্দ হলে 'Fix'
                const label = s.value.includes(' ') ? "Rephrase: " : "Fix: ";
                btn.innerHTML = `<strong>${label}</strong> ${s.value}`;
                
                btn.onclick = () => {
                    activeSpan.outerHTML = s.value;
                    tooltip.classList.remove('show');
                };
                rewriteOptions.appendChild(btn);
            });
        } else {
            tooltipText.style.display = 'block';
            tooltipText.innerText = "No suggestions found.";
        }

        // পজিশন সেট
        const rect = activeSpan.getBoundingClientRect();
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 8}px`; // একটু নিচে
        tooltip.classList.add('show');
    } else if (!tooltip.contains(e.target)) {
        tooltip.classList.remove('show');
    }
});

// Auto Fix All
document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    if(errors.length === 0) return alert("No errors found!");

    errors.forEach(span => {
        const suggestions = JSON.parse(span.dataset.suggestions || "[]");
        if (suggestions.length > 0) {
            span.outerHTML = suggestions[0].value;
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
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(func, delay) {
    let timeout;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(func, delay);
    };
}
