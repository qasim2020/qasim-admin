/**
 * modules/markupToHtml.js
 * Converts the custom line-based blog markup into HTML.
 * Used by cmsController (live conversion on save) and
 * scripts/convert-markup-to-html.js (batch migration).
 */

const IMAGE_BASE = process.env.BLOG_IMAGE_BASE_URL || '';

function resolveImg(val) {
    val = (val || '').trim();
    if (val.startsWith('http') || val.startsWith('/')) return val;
    return IMAGE_BASE + val;
}

function markupToHtml(content) {
    if (!content) return '';
    const lines = content.split('\n');
    const out   = [];
    let inList  = false;

    const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };

    for (const raw of lines) {
        const line = raw.trimEnd();
        const m    = line.match(/^([a-zA-Z0-9._-]+):\s*([\s\S]*)/);

        if (!m) {
            closeList();
            if (line.trim()) out.push(`<p>${line}</p>`);
            continue;
        }

        const fullTag  = m[1];
        const val      = m[2];
        const tagLower = fullTag.toLowerCase();
        const parts    = tagLower.split('.');
        const base     = parts[0];
        const mods     = new Set(parts.slice(1));

        // bullet list
        if (base === 'bullet') {
            if (!inList) { out.push('<ul class="mb-3 ps-4">'); inList = true; }
            out.push(`<li>${val}</li>`);
            continue;
        }
        closeList();

        // headings h1–h6
        if (/^h[1-6]$/.test(base)) {
            let cls = '';
            if      (mods.has('brown'))   cls = ' class="text-warning"';
            else if (mods.has('lavendar')) cls = ' class="text-info"';
            else if (mods.has('b-left'))  cls = ' class="border-start border-3 border-primary ps-3"';
            out.push(`<${base}${cls}>${val}</${base}>`);
            continue;
        }

        switch (base) {
            case 'p': {
                if (mods.has('code')) {
                    const cc = mods.has('comment') ? ' class="text-muted"' : mods.has('response') ? ' class="text-success"' : '';
                    out.push(`<pre class="bg-light rounded p-3"><code${cc}>${val}</code></pre>`);
                    break;
                }
                if (mods.has('note')) { out.push(`<div class="alert alert-info my-2">${val}</div>`); break; }
                if (mods.has('quote')) {
                    out.push(`<blockquote class="blockquote border-start border-5 border-warning ps-3 my-3"><p class="mb-0">${val}</p></blockquote>`);
                    break;
                }
                const classes = [];
                let styles = '';
                if (mods.has('bold'))     classes.push('fw-bold');
                if (mods.has('b-left'))   classes.push('border-start', 'border-3', 'border-secondary', 'ps-3');
                if (mods.has('bg-light')) classes.push('bg-light', 'rounded', 'p-2');
                if (mods.has('lavendar')) classes.push('text-info');
                if (mods.has('w-50'))     styles = 'max-width:50%';
                if (mods.has('caption') || mods.has('catpion') || tagLower.includes('caption') || tagLower.includes('text-center'))
                    classes.push('text-center', 'text-muted', 'small');
                const cls  = classes.length ? ` class="${classes.join(' ')}"` : '';
                const styl = styles ? ` style="${styles}"` : '';
                out.push(`<p${cls}${styl}>${val}</p>`);
                break;
            }
            case 'quote': {
                const isSimple = mods.has('normal') || mods.has('font-normal');
                const cls = isSimple ? 'blockquote fst-italic my-3' : 'blockquote border-start border-5 border-warning ps-3 my-3';
                out.push(`<blockquote class="${cls}"><p class="mb-0">${val}</p></blockquote>`);
                break;
            }
            case 'img': {
                let style = '';
                let extra = [];
                if      (mods.has('width-half') || mods.has('width-m-half') || mods.has('width-m-50')) style = 'max-width:50%';
                else if (mods.has('width-m-75'))  style = 'max-width:75%';
                else if (mods.has('width-m-600')) style = 'max-width:600px';
                if (mods.has('border'))       extra.push('border');
                if (mods.has('border-round')) extra.push('rounded');
                const cls  = ['img-fluid', 'my-2', ...extra].join(' ');
                const styl = style ? ` style="${style}"` : '';
                out.push(`<img src="${resolveImg(val)}" alt="" class="${cls}"${styl}>`);
                break;
            }
            case 'youtube':
                out.push(`<div class="ratio ratio-16x9 my-3">${val}</div>`);
                break;
            case 'iframe': {
                const w = (mods.has('w-75') || tagLower.includes('w-75')) ? 'w-75 d-block mx-auto' : 'w-100';
                out.push(`<div class="ratio ratio-16x9 my-3"><iframe src="${val}" class="${w}" allowfullscreen loading="lazy" frameborder="0"></iframe></div>`);
                break;
            }
            case 'verses':
                out.push(`<div class="verses bg-light rounded p-3 my-3 text-center fst-italic"><p class="mb-0">${val}</p></div>`);
                break;
            case 'table':
                out.push(`<div class="table-responsive my-3"><table class="table table-bordered table-sm">${val}</table></div>`);
                break;
            case 'code':
                out.push(`<pre class="bg-light rounded p-3"><code>${val}</code></pre>`);
                break;
            case 'dropdownh': {
                const header = val.replace(/^\d+\+\s*/, '');
                out.push(`<details class="mb-2 border rounded p-2"><summary class="fw-semibold" style="cursor:pointer">${header}</summary><div class="pt-2">`);
                break;
            }
            case 'dropdownf': {
                const body = val.replace(/^\d+\+\s*/, '');
                out.push(`<div>${body}</div></div></details>`);
                break;
            }
            case 'button': break; // skip UI-only elements
            default:
                if (val.trim()) out.push(`<p>${val}</p>`);
        }
    }

    closeList();
    return out.join('\n');
}

module.exports = markupToHtml;
