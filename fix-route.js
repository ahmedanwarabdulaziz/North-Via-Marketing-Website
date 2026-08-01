const fs = require('fs');

let content = fs.readFileSync('app/api/survey/route.ts', 'utf8');

// Undo the incorrect parts of 'rec' replacement
content = content.split('rec: anyommendations').join('recommendations');
content = content.split('rec: any =>').join('(rec: any) =>');
content = content.split('${rec: any}').join('${rec}');
content = content.split('rec: any:').join('rec:');
content = content.split('flag: any =>').join('(flag: any) =>');

fs.writeFileSync('app/api/survey/route.ts', content);
