const editor = document.getElementById('editor');
const tooltip = document.getElementById('tooltip');
const tooltipText = document.getElementById('tooltipText');
const applySuggest = document.getElementById('applySuggest');
let activeSpan = null;

editor.addEventListener('input', debounce(() => {
    checkGrammar();
}, 1200));

async function checkGrammar() {
    const text = editor.innerText;
    if (!text.trim()) return;

    try {
        // এখানে MORPHOLOGY_RULE ব্যবহার করে বানান ভুল এড়িয়ে শুধু গ্রামার ও ক্যাপিটালাইজেশন ধরা হচ্ছে
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=en-US&disabledRules=UPPERCASE_SENTENCE_START,SPELLCHECKING`
        });
        // SPELLCHECKING ডিজেবল করায় এটি আর নাম বদলাবে না, কিন্তু গ্রামার ধরবে

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
        const suggestion = match.replacements[0]?.value || "";

        html += escapeHtml(text.substring(lastIndex, start));
        // এরর স্প্যান যোগ
        html += `<span class="error" data-suggest="${escapeHtml(suggestion)}">${escapeHtml(text.substring(start, end))}</span>`;
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

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('error')) {
        activeSpan = e.target;
        const rect = activeSpan.getBoundingClientRect();
        tooltipText.innerText = `Suggested: ${activeSpan.dataset.suggest}`;
        tooltip.style.left = `${rect.left}px`;
        tooltip.style.top = `${rect.bottom + 5}px`;
        tooltip.classList.add('show');
    } else if (!tooltip.contains(e.target)) {
        tooltip.classList.remove('show');
    }
});

applySuggest.addEventListener('click', (e) => {
    e.stopPropagation();
    if (activeSpan && activeSpan.dataset.suggest) {
        activeSpan.outerHTML = activeSpan.dataset.suggest;
        tooltip.classList.remove('show');
        activeSpan = null;
    }
});

document.getElementById('fixButton').addEventListener('click', () => {
    const errors = document.querySelectorAll('.error');
    errors.forEach(span => {
        if (span.dataset.suggest) span.outerHTML = span.dataset.suggest;
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
