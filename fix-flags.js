const fs = require('fs');

let content = fs.readFileSync('app/api/survey/route.ts', 'utf8');

content = content.split('flag: anys').join('flags');
content = content.split('${flag: any}').join('${flag}');
content = content.split('flag: any:').join('flag:');

fs.writeFileSync('app/api/survey/route.ts', content);
