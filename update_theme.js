const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Remove Google Font ZCOOL KuaiLe
html = html.replace(/<link href="https:\/\/fonts.googleapis.com\/css2\?family=ZCOOL\+KuaiLe&display=swap" rel="stylesheet">\r?\n/g, '');

// Replace amber theme with macaron theme (pink/purple/teal pastel)
html = html.replace(/bg-amber-50/g, 'bg-pink-50');
html = html.replace(/bg-amber-100/g, 'bg-fuchsia-100');
html = html.replace(/bg-amber-200/g, 'bg-fuchsia-200');
html = html.replace(/border-amber-200/g, 'border-pink-200');
html = html.replace(/border-amber-300/g, 'border-pink-300');
html = html.replace(/border-amber-900/g, 'border-pink-400');
html = html.replace(/text-amber-700/g, 'text-fuchsia-700');
html = html.replace(/text-amber-800/g, 'text-purple-800');
html = html.replace(/text-amber-900/g, 'text-purple-900');
html = html.replace(/bg-amber-800/g, 'bg-fuchsia-400');

// Additional adjustments for Macaron feel
html = html.replace(/bg-\[\#fdfbf7\]/g, 'bg-[#fff5f8]');
html = html.replace(/text-gray-800/g, 'text-slate-700');

fs.writeFileSync('index.html', html);
console.log('HTML colors updated.');
