const fs = require('fs');
const echarts = require('echarts');

let content = fs.readFileSync('README.md', 'utf8');
const startMarker = "<!-- PDF_SKILLS_START";
const endMarker = "PDF_SKILLS_END -->";
const skillsBlock = content.substring(content.indexOf(startMarker) + startMarker.length, content.indexOf(endMarker)).trim();

const categories = {};
let currentCat = null;
for (let line of skillsBlock.split('\n')) {
    line = line.trim();
    if (line.startsWith('#### ')) {
        currentCat = line.replace('#### ', '').trim();
        categories[currentCat] = [];
    } else if (line && currentCat && line.includes('`')) {
        const skills = line.match(/`([^`]+)`/g);
        if (skills) {
            for (let s of skills) {
                let cleanSkill = s.replace(/`/g, '').replace(/,/g, '').replace(/[\(\)]/g, '').replace(/"/g, '');
                categories[currentCat].push(cleanSkill);
            }
        }
    }
}

const hubChildren = [
    'Communication Protocols',
    'CI/CD & Development Tools',
    'Systems Engineering & Design Tools',
    'Engineering Software & Analysis'
];

const branchColors = {
    'Automotive & Embedded Systems': '#FF3366',      
    'MBD/MBSE & Simulation': '#33CCFF',              
    'Testing & Measurement': '#FFCC00',              
    'Domain Knowledge': '#33FF99',                   
    'Communication Protocols': '#B266FF',            
    'CI/CD & Development Tools': '#FF9933',          
    'Systems Engineering & Design Tools': '#00FFCC', 
    'Engineering Software & Analysis': '#FF33CC',    
    'Languages': '#7FFF00'                           
};

const nodesMap = new Map();
const links = [];

nodesMap.set('Skills & Expertise', { 
    name: 'Skills & Expertise', 
    depth: 0, 
    label: { position: 'right' },
    itemStyle: { color: '#58a6ff' } 
});

nodesMap.set('Software Systems & Tools', { 
    name: 'Software Systems & Tools', 
    depth: 1, 
    label: { position: 'left' },
    itemStyle: { color: '#d2a8ff' } 
});
links.push({ source: 'Skills & Expertise', target: 'Software Systems & Tools', value: 0 }); 

// Pass 1: Process all Software Systems subcategories FIRST. 
// This ensures they sit at the very top of Column 3, aligning perfectly with the Software Systems hub at the top of Column 2.
for (const cat in categories) {
    if (hubChildren.includes(cat)) {
        const catWeight = categories[cat].length;
        const branchColor = branchColors[cat] || '#ffffff';
        
        nodesMap.set(cat, { 
            name: cat, 
            depth: 2, 
            label: { position: 'left' },
            itemStyle: { color: branchColor }
        });
        links.push({ source: 'Software Systems & Tools', target: cat, value: catWeight });
        links.find(l => l.target === 'Software Systems & Tools').value += catWeight;
        
        for (const skill of categories[cat]) {
            nodesMap.set(skill, { 
                name: skill, 
                depth: 3, 
                label: { position: 'right', distance: 10 },
                itemStyle: { color: branchColor } 
            });
            links.push({ source: cat, target: skill, value: 1 });
        }
    }
}

// Pass 2: Process all standalone categories (Automotive, MBD, etc) SECOND.
// This ensures they sit below Software Systems in Column 2, and their dummy nodes sit below the subcategories in Column 3.
for (const cat in categories) {
    if (!hubChildren.includes(cat)) {
        const catWeight = categories[cat].length;
        const branchColor = branchColors[cat] || '#ffffff';
        
        nodesMap.set(cat, { 
            name: cat, 
            depth: 1, 
            label: { position: 'left' },
            itemStyle: { color: branchColor }
        });
        links.push({ source: 'Skills & Expertise', target: cat, value: catWeight });
        
        const dummyName = cat + ' \u200B'; 
        nodesMap.set(dummyName, { 
            name: dummyName, 
            depth: 2, 
            label: { show: false }, 
            itemStyle: { 
                color: branchColor,
                opacity: 0.4,
                borderWidth: 0
            } 
        });
        links.push({ source: cat, target: dummyName, value: catWeight });
        
        for (const skill of categories[cat]) {
            nodesMap.set(skill, { 
                name: skill, 
                depth: 3, 
                label: { position: 'right', distance: 10 },
                itemStyle: { color: branchColor } 
            });
            links.push({ source: dummyName, target: skill, value: 1 });
        }
    }
}

const nodes = Array.from(nodesMap.values());

const chart = echarts.init(null, null, {
  renderer: 'svg',
  ssr: true,
  width: 3200, // Giant canvas to support giant font
  height: 2800 
});

chart.setOption({
  backgroundColor: '#000000',
  series: [
    {
      type: 'sankey',
      data: nodes,
      links: links,
      nodeAlign: 'justify',
      layoutIterations: 0, // FIX: Disable automatic algorithmic sorting. This forces strict top-to-bottom ordering with zero crossings!
      nodeGap: 14,
      nodeWidth: 16,
      left: 20,
      top: 40,
      bottom: 40,
      right: 1200, // Massive runway for giant font
      lineStyle: {
        color: 'gradient', 
        curveness: 0.5,
        opacity: 0.4
      },
      itemStyle: {
        borderWidth: 1,
        borderColor: '#000000'
      },
      label: {
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 34, // Giant readable font
        fontWeight: 600,
        padding: [0, 8, 0, 8]
      }
    }
  ]
});

let svg = chart.renderToSVGString();

// FIX 1: Strip out SVG clipping masks so text that renders outside the Sankey box is fully visible!
svg = svg.replace(/clip-path="url\(#[^)]+\)"/g, '');

if (!fs.existsSync('assets')) fs.mkdirSync('assets');
fs.writeFileSync('assets/sankey.svg', svg, 'utf-8');
console.log('✅ Generated ECharts SVG successfully! Text clipping disabled.');

// FIX 2: Release the Node terminal by destroying the ECharts instance
chart.dispose();
