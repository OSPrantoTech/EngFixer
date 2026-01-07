// তোমার দেওয়া Sapling API Key সরাসরি এখানে সেট করা হয়েছে
const API_KEY = 'THJ41LL8XDMVWZLPN9MQOYN7FS17ZZEL';

const editor = document.getElementById('editor');
const fixButton = document.getElementById('fixButton');

// এডিটর খালি থাকলে এরর দেখাবে না, তাই চেক করে নিচ্ছি
if (!API_KEY) {
    editor.innerHTML = '<p style="color:red; text-align:center;">Error: API key not found.</p>';
    fixButton.disabled = true;
}

let currentEdits = [];

// টাইপ করা থামানোর ৮০০ মিলি-সেকেন্ড পর চেক করবে
editor.addEventListener('input', debounce(checkText, 800));

async function checkText() {
    const text = editor.innerText.trim();
    if (text.length === 0 || !API_KEY) {
        removeAllUnderlines();
        return;
    }

    try {
        const response = await fetch('https://api.sapling.ai/api/v1/edits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: API_KEY,
                text: text,
                session_id: 'ospranto-checker'
            })
        });

        const data = await response.json();
        currentEdits = data.edits || [];

        removeAllUnderlines();

        if (currentEdits.length > 0) {
            let html = editor.innerHTML;
            // উল্টো দিক থেকে রিপ্লেস করছি যাতে ইনডেক্স ঠিক থাকে
            const sortedEdits = [...currentEdits].sort((a, b) => b.start - a.start);

            for (const edit of sortedEdits) {
                const start = edit.start;
                const end = edit.end;
                const errorText = editor.innerText.substring(start, end);
                const replacement = edit.replacement || errorText;

                // লাল রঙের ঢেউখেলানো আন্ডারলাইন যোগ করা
                const span = `<span class="error-underline" data-replacement="${escapeHtml(replacement)}">${escapeHtml(errorText)}</span>`;
                
                // HTML আপডেট করার সময় টেক্সট ইনডেক্স ঠিক রাখা
                const textBefore = editor.innerText.substring(0, start);
                const textAfter = editor.innerText.substring(end);
                
                // এটি সিম্পল রাখার জন্য ডাইরেক্ট রিপ্লেস ব্যবহার করা হয়েছে
                editor.innerHTML = escapeHtml(textBefore) + span + escapeHtml(textAfter);
            }
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}

function removeAllUnderlines() {
    document.querySelectorAll('.error-underline').forEach(span => {
        span.outerHTML = span.innerHTML;
    });
}

// অটো ফিক্স বাটনে ক্লিক করলে সব ভুল ঠিক হয়ে যাবে
fixButton.addEventListener('click', () => {
    const underlines = document.querySelectorAll('.error-underline');
    if (underlines.length === 0) {
        alert('কোনো ভুল পাওয়া যায়নি! তোমার লেখা একদম ঠিক আছে! 🎉');
        return;
    }

    underlines.forEach(span => {
        const replacement = span.getAttribute('data-replacement');
        if (replacement) {
            span.outerHTML = replacement;
        }
    });

    currentEdits = [];
    alert('সব ভুল অটোমেটিক ঠিক করে দেওয়া হয়েছে! ✨');
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
