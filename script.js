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
        // Using MORPHOLOGY_RULE to avoid spelling errors and focus on grammar and capitalization.
        const response = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `text=${encodeURIComponent(text)}&language=en-US&disabledRules=SPELLCHECKING`
        });
        // SPELLCHECKING is disabled, so it won't change names but will catch grammar mistakes.

        const data = await response.json();
        highlightErrors(data.matches);
    } catch (err) {
        console.error('API Error:', err);
    }
}

function highlightErrors(matches) {
    // Save cursor position
    const caretOffset = getCaretCharacterOffsetWithin(editor);

    const text = editor.innerText;
    let html = '';
    let lastIndex = 0;

    matches.forEach(match => {
        const start = match.offset;
        const end = match.offset + match.length;
        const suggestion = match.replacements[0]?.value || "";

        html += escapeHtml(text.substring(lastIndex, start));
        // Add error span
        html += `<span class="error" data-suggest="${escapeHtml(suggestion)}">${escapeHtml(text.substring(start, end))}</span>`;
        lastIndex = end;
    });

    html += escapeHtml(text.substring(lastIndex));
    
    editor.innerHTML = html;

    // Restore cursor position
    setCaretPosition(editor, caretOffset);
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

function getCaretCharacterOffsetWithin(element) {
    let caretOffset = 0;
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const sel = win.getSelection();
    if (sel.rangeCount > 0) {
        const range = win.getSelection().getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
}

function setCaretPosition(el, offset) {
    let range = document.createRange();
    let sel = window.getSelection();
    let charCount = 0;
    let found = false;

    function traverse(node) {
        if (found) return;
        if (node.nodeType == 3) {
            let nextCharCount = charCount + node.length;
            if (offset >= charCount && offset <= nextCharCount) {
                range.setStart(node, offset - charCount);
                found = true;
            }
            charCount = nextCharCount;
        } else if (node.nodeType == 1) {
            for (var i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
                if (found) break;
            }
        }
    }

    traverse(el);

    if (found) {
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    } else {
        placeCaretAtEnd(el);
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
