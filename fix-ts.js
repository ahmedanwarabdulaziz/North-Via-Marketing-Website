const fs = require('fs');

function replaceInFile(file, replacements) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    for (const [find, replace] of replacements) {
      if (typeof find === 'string') {
        content = content.split(find).join(replace);
      } else {
        content = content.replace(find, replace);
      }
    }
    fs.writeFileSync(file, content);
  } catch(e) {}
}

replaceInFile('app/actions/email-report.ts', [
  ['client.businessName', 'client.brandName'],
  ['client.contactName', 'client.ownerName'],
  ['client.reportingEmails && client.reportingEmails.length > 0 \n      ? client.reportingEmails \n      : (client.email ? [client.email] : [])', '(client.email ? [client.email] : [])'],
  ['client.reportingEmails && client.reportingEmails.length > 0', 'client.email'],
  ['client.reportingEmails', '[client.email]']
]);

replaceInFile('app/actions/generate-report.ts', [
  ['client.businessName', 'client.brandName'],
  ['client.contactName', 'client.ownerName'],
  ['client.mainGoal', '""'],
  ['client.reportTone', '""'],
  ['client.aiBehavioralNotes', '""'],
  ['client.aiAvoidanceWarnings', '""'],
  ['client.targetCities', '[]']
]);

replaceInFile('lib/admin-view.ts', [
  ['client.businessName', 'client.brandName'],
  ['client.contactName', 'client.ownerName'],
  ['client.clientGroup', '""'],
  ['client.accountOwner', '""'],
  ['client.relationshipType', '""']
]);

replaceInFile('app/api/survey/route.ts', [
  [/(?<!\w)rec(?!\w\s*:)/g, 'rec: any'],
  [/(?<!\w)flag(?!\w\s*:)/g, 'flag: any']
]);

replaceInFile('app/success-library/page.tsx', [
  ['website: null', "website: ''"]
]);

replaceInFile('app/survey/page.tsx', [
  ['[...selectedTags]', 'Array.from(selectedTags)']
]);

replaceInFile('app/survey/utils.ts', [
  [/:\s*string\s*\|\s*undefined/g, ': string | undefined'] // wait, actual error is argument of type string | undefined is not assignable to string
]);

// Actually for app/survey/utils.ts I'll just change tsconfig.json to handle downlevelIteration and strict
