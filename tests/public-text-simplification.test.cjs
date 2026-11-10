const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file) {
  const absolute = path.resolve(file);
  const loaded = new Module(absolute, module);
  loaded.paths = module.paths;
  loaded.require = id => {
    if (id === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve(id.slice(2)) : path.resolve(path.dirname(absolute), id);
      const resolved = ['.tsx', '.ts'].map(ext => base + ext).find(fs.existsSync);
      if (resolved) return load(resolved);
    }
    return require(id);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports;
}
function render(file, props) { return renderToStaticMarkup(React.createElement(load(file).default, props)); }
function defaultText(html) {
  let depth = 0;
  return html.split(/(<\/?details\b[^>]*>)/).map(part => {
    if (part.startsWith('<details')) { depth++; return ''; }
    if (part.startsWith('</details')) { depth--; return ''; }
    return depth ? '' : part;
  }).join('').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

test('standalone and embedded supplier applications have one primary heading and keep fee information visible', () => {
  for (const file of ['app/(site)/vendors/page.tsx', 'app/(site)/suppliers/join/page.tsx']) {
    const html = render(file);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /name="businessName"/);
    assert.match(html, /name="email"/);
    assert.match(html, /Apply to join/);
  }
  const joined = render('app/(site)/suppliers/join/page.tsx');
  assert.match(defaultText(joined), /No listing or subscription fee/);
  assert.match(defaultText(joined), /Commission is agreed/);
  assert.match(joined, /<h2[^>]*>Apply to join<\/h2>/);
});

test('venue onboarding moves guidance into native disclosures but keeps application and commercial notice visible', () => {
  const html = render('app/(site)/venues/partner/page.tsx');
  assert.match(html, /<summary[^>]*>What you’ll need<\/summary>/);
  assert.match(html, /<summary[^>]*>Supplier options and listing review<\/summary>/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
  assert.match(defaultText(html), /Contracts, commission and payment arrangements are agreed before bookings/);
  assert.match(defaultText(html), /Send venue application/);
});

test('signed-in venue enquiry keeps confirmation and no-payment notices beside its submit action', () => {
  const html = render('components/venues/VenueEnquiryForm.tsx', {
    venueId: 'example', slug: 'example', packages: [], accountEmail: 'couple@example.test',
  });
  assert.match(defaultText(html), /Your date and suppliers need confirmation\. No payment is taken/);
  assert.match(defaultText(html), /Send booking request/);
  assert.match(html, /value="couple@example.test"/);
});
