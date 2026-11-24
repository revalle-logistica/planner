import pathlib
d=pathlib.Path(__file__).parent
code=(d.parent/'apps-script'/'Code.gs').read_text()
import re
for n in ['rows','append','update','delRows','readFile','writeFile','ss','folder','enviarEmail_']:
    code,k=re.subn(r'^function %s\('%n,'function %s__gs('%n,code,flags=re.M); assert k==1,n
out=(d/'prelude.js').read_text()+'\n// ===== apps-script/Code.gs (sem mudanças)\n'+code+'\n'+(d/'overrides.js').read_text()+(d/'handler.js').read_text()
(d/'functions'/'api'/'index.ts').write_text(out)
print('ok',len(out))
