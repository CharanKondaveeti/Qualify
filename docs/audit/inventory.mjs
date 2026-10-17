import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import postcss from 'postcss';

const root = process.cwd();
const out = path.join(root, 'docs/audit');
const norm = p => path.relative(root, p).replaceAll('\\', '/');
const walkFiles = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(e => e.isDirectory() ? walkFiles(path.join(dir,e.name)) : [path.join(dir,e.name)]);
const files = ['src','supabase','tests','public'].flatMap(d => walkFiles(path.join(root,d)));
const source = files.filter(f => /\.(jsx?|mjs|css|sql|csv)$/.test(f));
const records = [];
const trees = ['# JSX tree inventory', '', 'Source-derived trees for every JSX file, including conditional branches, repeated templates and currently unreachable components. These are not claims that every branch was rendered in a browser. Component tags refer to their own file trees; expressions are abbreviated. Line numbers refer to the inspected source.', ''];
const selectors = new Map();
const declarations = new Set();
const calls = [];
function walk(n, fn, ancestors=[]) {
  if (!n || typeof n !== 'object') return;
  if (n.type) fn(n,ancestors);
  for (const [k,v] of Object.entries(n)) {
    if (['loc','start','end','comments','tokens'].includes(k)) continue;
    if (Array.isArray(v)) v.forEach(c=>walk(c,fn,[...ancestors,n]));
    else if (v && typeof v==='object') walk(v,fn,[...ancestors,n]);
  }
}
const name = n => n?.name || (n?.type==='JSXMemberExpression' ? `${name(n.object)}.${name(n.property)}` : '?');
for (const file of source) {
  const text = fs.readFileSync(file,'utf8');
  const r = {file:norm(file),lines:text.split(/\r?\n/).length,bytes:Buffer.byteLength(text)};
  if (/\.(jsx?|mjs)$/.test(file)) {
    const ast = parse(text,{sourceType:'module',plugins:['jsx']});
    r.imports=[]; r.jsxElements=0; r.components=[]; r.exports=[]; r.domReview=[];
    const short = n => text.slice(n.start,n.end).replace(/\s+/g,' ').slice(0,160);
    if(file.endsWith('.jsx')) trees.push(`## ${r.file}`, '', '```text');
    walk(ast,(n,ancestors)=>{
      if(n.type==='ImportDeclaration') r.imports.push(n.source.value);
      if(n.type==='ExportNamedDeclaration') r.exports.push(...(n.specifiers||[]).map(s=>s.exported.name),...(n.declaration?.id?[n.declaration.id.name]:[]));
      if(n.type==='CallExpression' && n.callee.type==='Import' && n.arguments[0]?.value) r.imports.push(n.arguments[0].value);
      if(n.type==='CallExpression' && (n.callee.name==='rpc'||n.callee.property?.name==='rpc') && typeof n.arguments[0]?.value==='string') calls.push({name:n.arguments[0].value,file:r.file,line:n.loc.start.line});
      if(n.type==='JSXElement') {
        r.jsxElements++;
        const o=n.openingElement, tag=name(o.name);
        const attrs=Object.fromEntries(o.attributes.filter(a=>a.type==='JSXAttribute').map(a=>[name(a.name),a.value?.type==='StringLiteral'?a.value.value:a.value?short(a.value):true]));
        if(/^[A-Z]/.test(tag))r.components.push(tag);
        const depth=ancestors.filter(a=>a.type==='JSXElement'||a.type==='JSXFragment').length;
        const info=Object.entries(attrs).filter(([k])=>['className','id','role','aria-label','aria-labelledby','htmlFor','type','to','href'].includes(k)).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join(' ');
        if(file.endsWith('.jsx'))trees.push(`${'  '.repeat(depth)}${tag}${info?' '+info:''} [L${n.loc.start.line}]`);
        if(['div','span'].includes(tag)&&attrs.onClick&&!attrs.onKeyDown&&!attrs.role)r.domReview.push({line:n.loc.start.line,issue:'Mouse interaction on non-semantic element',tag});
        if(['input','select','textarea'].includes(tag)&&!attrs.id&&!attrs['aria-label']&&!attrs['aria-labelledby']&&!ancestors.some(a=>a.type==='JSXElement'&&name(a.openingElement.name)==='label'))r.domReview.push({line:n.loc.start.line,issue:'Control lacks explicit label association (manual review)',tag});
        if(attrs.role==='dialog'&&!attrs['aria-label']&&!attrs['aria-labelledby'])r.domReview.push({line:n.loc.start.line,issue:'Dialog has no accessible name',tag});
      }
    });
    r.components=[...new Set(r.components)];
    if(file.endsWith('.jsx')) trees.push('```','',...(r.domReview.length?r.domReview.map(i=>`- L${i.line}: ${i.issue}.`):['No issues flagged by the limited structural heuristics; this is not a full accessibility pass.']),'');
  }
  if(file.endsWith('.css')) {
    const ast=postcss.parse(text,{from:file});r.rules=0;r.media=[];r.important=0;
    ast.walkRules(rule=>{r.rules++;for(const selector of rule.selectors||[]){const list=selectors.get(selector)||[];list.push(`${r.file}:${rule.source.start.line}`);selectors.set(selector,list);}});
    ast.walkAtRules('media',a=>r.media.push(a.params));
    ast.walkDecls(d=>{if(d.important)r.important++;});
  }
  if(file.endsWith('.sql')) {r.functions=[...text.matchAll(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.(\w+)/gi)].map(m=>m[1]);r.functions.forEach(n=>declarations.add(n));}
  records.push(r);
}
const byFile=new Map(records.map(r=>[r.file,r]));
function resolve(from,imp){if(!imp.startsWith('.'))return null;const p=norm(path.resolve(root,path.dirname(from),imp));return [p,p+'.js',p+'.jsx',p+'.css',p+'/index.js',p+'/index.jsx'].find(p=>byFile.has(p));}
const reached=new Set();
function visit(file){if(reached.has(file))return;reached.add(file);for(const imp of byFile.get(file)?.imports||[]){const target=resolve(file,imp);if(target)visit(target);}}
visit('src/main.jsx');
const summary={sourceFiles:records.length,sourceLines:records.reduce((s,r)=>s+r.lines,0),jsxFiles:records.filter(r=>r.file.endsWith('.jsx')).length,jsxElements:records.reduce((s,r)=>s+(r.jsxElements||0),0),cssFiles:records.filter(r=>r.file.endsWith('.css')).length,sqlFiles:records.filter(r=>r.file.endsWith('.sql')).length,unreachable:records.filter(r=>/^src\//.test(r.file)&&/\.(jsx?|css)$/.test(r.file)&&!reached.has(r.file)).map(r=>r.file),missingRpcDefinitions:calls.filter(c=>!declarations.has(c.name)),duplicateSelectors:[...selectors].filter(([,loc])=>new Set(loc.map(l=>l.split(':')[0])).size>1).map(([selector,locations])=>({selector,locations})),records};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'INVENTORY.json'),JSON.stringify(summary,null,2)+'\n');
fs.writeFileSync(path.join(out,'DOM_TREES.md'),trees.join('\n')+'\n');
fs.writeFileSync(path.join(out,'FILE_INDEX.md'),['# File coverage index','','Every first-party source, stylesheet, SQL, test and CSV file is listed below. Dependencies, generated build output and archived source are separate from active application code.','','| File | Lines | Structure |','|---|---:|---|',...records.map(r=>`| ${r.file} | ${r.lines} | ${r.jsxElements!==undefined?`${r.jsxElements} JSX elements; ${(r.imports||[]).length} imports`:r.rules!==undefined?`${r.rules} CSS rules; ${r.media.length} media queries; ${r.important} !important`:r.functions?`${r.functions.length} SQL functions`:'data'} |`)].join('\n')+'\n');
const {records:_,duplicateSelectors,...brief}=summary;
console.log(JSON.stringify({...brief,duplicateSelectorCount:duplicateSelectors.length},null,2));
