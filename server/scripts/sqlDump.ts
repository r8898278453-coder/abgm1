/** A deliberately narrow phpMyAdmin dump reader. Never execute comments or client commands. */
export function parseSqlDump(source:string):string[]{
 if(Buffer.byteLength(source)>32*1024*1024 || source.includes('\0'))throw new Error('DUMP_SIZE_OR_ENCODING');
 const statements:string[]=[];let current='',quote='',comment='';
 for(let i=0;i<source.length;i++){
  const c=source[i],n=source[i+1];
  if(comment==='line'){if(c==='\n'){comment='';current+='\n';}continue;}
  if(comment==='block'){if(c==='*'&&n==='/'){comment='';current+=' ';i++;}continue;}
  if(quote){current+=c;if(c==='\\'){if(i+1<source.length)current+=source[++i];}else if(c===quote){if(n===quote)current+=source[++i];else quote='';}continue;}
  if(c==='-'&&n==='-'&&/\s/.test(source[i+2]||'')){comment='line';i++;continue;}
  if(c==='#'){comment='line';continue;}
  if(c==='/'&&n==='*'){// Conditional comments are not executed; supported dumps use these only for session SETs.
   const end=source.indexOf('*/',i+2);if(end<0)throw new Error('DUMP_UNTERMINATED_COMMENT');
   const body=source.slice(i+2,end);if(body.startsWith('!')&&!/^!\d*\s+SET\s/i.test(body))throw new Error('DUMP_EXECUTABLE_COMMENT');
   comment='block';i++;continue;
  }
  if(c==="'"||c==='"'||c==='`'){quote=c;current+=c;continue;}
  if(c===';'){if(current.trim())statements.push(current.trim());current='';}else current+=c;
 }
 if(quote||comment==='block'||current.trim())throw new Error('DUMP_UNTERMINATED_STATEMENT');
 for(const [index,sql] of statements.entries()){
  // Strip literals before checking SQL structure so customer text cannot become executable syntax.
  const shape=sql.replace(/'(?:\\.|''|[^'\\])*'|"(?:\\.|""|[^"\\])*"/gs,"''");
  const allowed=/^(?:SET\s+(?:SQL_MODE|time_zone|NAMES)\b|START\s+TRANSACTION\s*$|COMMIT\s*$|CREATE\s+TABLE\s+`[a-z_][a-z0-9_]*`\s*\(|ALTER\s+TABLE\s+`[a-z_][a-z0-9_]*`\s+|INSERT\s+INTO\s+`[a-z_][a-z0-9_]*`\s*\()/i;
  if(!allowed.test(shape)||/[\\.]/.test(shape.replace(/\b\d+\.\d+\b/g,'0'))||/\b(?:SELECT|OUTFILE|DUMPFILE|LOAD_FILE|SLEEP|BENCHMARK|REFERENCES|DIRECTORY|GLOBAL|SESSION_USER|SYSTEM|GRANT|TRIGGER|PROCEDURE|FUNCTION|EVENT)\b/i.test(shape))throw new Error('DUMP_STATEMENT_NOT_SUPPORTED_'+index);
  if(/^INSERT/i.test(shape)&&! /\)\s+VALUES\s*\(/i.test(shape))throw new Error('DUMP_INSERT_NOT_VALUES');
 }
 if(!statements.length)throw new Error('DUMP_EMPTY');return statements;
}
