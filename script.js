const API_KEY = 'YOUR_SAPLING_API_KEY_HERE'; // এখানে তোমার API key বসাও
const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

// রিয়েল-টাইমে চেক করার জন্য input event
editor.addEventListener('input', debounce(checkText, 800));

async function checkText() {
    const text = editor.innerText.trim();
    if (text.length === 0) return;

    try {
        const response = await fetch('https://api.sapling.ai/api/v1/edits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: API_KEY,
                text: text,
                session_id: 'ospranto-checker'
            })
        });

        const data = await response.json();
        
        // পুরানো underlines সাফ করো
        removeAllUnderlines();

        // নতুন errors underline করো
        if (data.edits && data.edits.length > 0) {
            const edits = data.edits.sort((a, b) => b.start - a.start); // reverse order to avoid index shift

            let html = editor.innerHTML;
            for (const edit of edits) {
                const start = edit.start;
                const end = edit.end;
                const errorText = html.substring(start, end);
                const replacement = `<span class="error-underline" data-replacement="${edit.replacement}">${errorText}</span>`;
                html = html.substring(0, start) + replacement + html.substring(end);
            }
            editor.innerHTML = html;
        }
    } catch (err) {
        console.error('Error checking text:', err);
    }
}

// সব underlines সরানো
function removeAllUnderlines() {
    const underlines = editor.querySelectorAll('.error-underline');
    underlines.forEach(span => {
        span.outerHTML = span.innerHTML; // remove span but keep text
    });
}

// Auto Fix All
fixButton.addEventListener('click', async () => {
    await checkText(); // প্রথমে latest edits নিয়ে আসো
    const underlines = editor.querySelectorAll('.error-underline');
    if (underlines.length === 0) {
        alert('No errors found! Great job! 🎉');
        return;
    }

    // সব replacement অ্যাপ্লাই করো (reverse order)
    underlines.forEach(span => {
        const replacement = span.getAttribute('data-replacement');
        if (replacement) {
            span.outerHTML = replacement;
        }
    });

    alert('All errors fixed automatically! ✨');
});

// Debounce ফাংশন যাতে প্রতি টাইপে API কল না যায়
function debounce(func, delay) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(func, delay);
    };
}
