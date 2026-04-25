const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// Ensure tailwind config is added
if (!html.includes('tailwind.config')) {
    const tailwindConfig = `
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        theme: {
                            pink: '#F3D8C3',
                            blue: '#6090B8',
                            white: '#FFFFFF',
                        }
                    }
                }
            }
        }
    </script>
</head>`;
    html = html.replace('</head>', tailwindConfig);
}

// Map backgrounds
html = html.replace(/bg-pink-50/g, 'bg-theme-pink/40');
html = html.replace(/bg-fuchsia-100/g, 'bg-theme-pink');
html = html.replace(/bg-fuchsia-200/g, 'bg-theme-blue/20');
html = html.replace(/bg-fuchsia-400/g, 'bg-theme-blue');
html = html.replace(/bg-\[\#fff5f8\]/g, 'bg-theme-white');
html = html.replace(/bg-white/g, 'bg-theme-white');
html = html.replace(/bg-green-50/g, 'bg-theme-pink/60');
html = html.replace(/bg-red-50/g, 'bg-theme-pink/80');
html = html.replace(/bg-red-100/g, 'bg-theme-pink/80');
html = html.replace(/bg-blue-100/g, 'bg-theme-blue/20');
html = html.replace(/bg-black\/50/g, 'bg-theme-blue/50'); // backdrop

// Map borders
html = html.replace(/border-pink-400/g, 'border-theme-blue');
html = html.replace(/border-pink-300/g, 'border-theme-blue/50');
html = html.replace(/border-pink-200/g, 'border-theme-blue/30');
html = html.replace(/border-red-300/g, 'border-theme-blue/50');
html = html.replace(/border-blue-300/g, 'border-theme-blue/50');

// Map text
html = html.replace(/text-slate-700/g, 'text-theme-blue');
html = html.replace(/text-purple-900/g, 'text-theme-blue');
html = html.replace(/text-purple-800/g, 'text-theme-blue');
html = html.replace(/text-fuchsia-700/g, 'text-theme-blue/90');
html = html.replace(/text-gray-800/g, 'text-theme-blue');
html = html.replace(/text-gray-600/g, 'text-theme-blue/70');
html = html.replace(/text-gray-500/g, 'text-theme-blue/60');
html = html.replace(/text-green-700/g, 'text-theme-blue');
html = html.replace(/text-green-600/g, 'text-theme-blue');
html = html.replace(/text-red-700/g, 'text-theme-blue');
html = html.replace(/text-red-500/g, 'text-theme-blue');
html = html.replace(/text-blue-700/g, 'text-theme-blue');
html = html.replace(/text-blue-600/g, 'text-theme-blue');
html = html.replace(/text-white/g, 'text-theme-white');

// If there are any style tags or specific things
html = html.replace(/text-\[\#fdfbf7\]/g, 'text-theme-white');

fs.writeFileSync('index.html', html);
console.log('HTML colors updated.');
