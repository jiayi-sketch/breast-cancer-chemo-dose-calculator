#!/usr/bin/env python3
# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
"""Read only the declarative data AST from recovered text; never import/execute it.

The catalogue loop repair is supported by original bytecode offsets 350–458:
TAC and the last reference card occur AFTER the HR-copy loop, not inside it.
This exports a historical snapshot, not the clinically reviewed live catalogue.
"""
import ast
import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
env = {}

def med(name, kind, dose, schedule, duration='', note=''):
    return dict(name=name, kind=kind, dose=dose, schedule=schedule, duration=duration, note=note)

def add(section, subtype, name, level, pages, eligibility, drugs, notes=''):
    env['REGIMENS'].append(dict(section=section, subtype=subtype, name=name, level=level,
                               pages=pages, eligibility=eligibility, drugs=drugs, notes=notes))

def ac(epi=(90, 100), cyclo=600, schedule='d1，每21天', duration='共4周期'):
    return [med('表柔比星', 'bsa_range', epi, schedule, duration),
            med('环磷酰胺', 'bsa', cyclo, schedule, duration)]

def append(name, drugs, pages, subtype='HER2阳性', notes=''):
    add('术后辅助治疗', subtype, name, '按术后风险分层，见对应推荐表', pages,
        '已确认术后全身治疗指征；具体分层由医生复核。', drugs, notes)

FUNCTIONS = {'med': med, 'add': add, 'ac': ac, 'append': append,
             'deepcopy': copy.deepcopy, 'list': list, 'dict': dict, 'next': next}

def expr(n):
    if isinstance(n, ast.Constant): return n.value
    if isinstance(n, ast.Name): return env[n.id]
    if isinstance(n, (ast.List, ast.Tuple, ast.Set)):
        return {ast.List:list, ast.Tuple:tuple, ast.Set:set}[type(n)](expr(x) for x in n.elts)
    if isinstance(n, ast.Dict): return {expr(k):expr(v) for k,v in zip(n.keys,n.values)}
    if isinstance(n, ast.Subscript): return expr(n.value)[expr(n.slice)]
    if isinstance(n, ast.BinOp) and isinstance(n.op, ast.Add): return expr(n.left)+expr(n.right)
    if isinstance(n, ast.BinOp) and isinstance(n.op, ast.Mod): return expr(n.left)%expr(n.right)
    if isinstance(n, ast.Compare) and len(n.ops)==1:
        a,b=expr(n.left),expr(n.comparators[0])
        if isinstance(n.ops[0],ast.Eq): return a==b
        if isinstance(n.ops[0],ast.In): return a in b
    if isinstance(n, ast.GeneratorExp):
        g=n.generators[0]
        assert len(n.generators)==1 and isinstance(g.target,ast.Name)
        items=[]
        for value in expr(g.iter):
            env[g.target.id]=value
            if all(expr(c) for c in g.ifs): items.append(expr(n.elt))
        return iter(items)
    if isinstance(n, ast.Call):
        args=[expr(x) for x in n.args]; kwargs={x.arg:expr(x.value) for x in n.keywords}
        if isinstance(n.func,ast.Name) and n.func.id in FUNCTIONS:
            return FUNCTIONS[n.func.id](*args,**kwargs)
        if isinstance(n.func,ast.Attribute):
            value=expr(n.func.value)
            if type(value) is list and n.func.attr in ('append','remove'):
                return getattr(value,n.func.attr)(*args,**kwargs)
    raise ValueError('Unsupported data expression: '+ast.dump(n))

def statements(nodes):
    for n in nodes:
        if isinstance(n,ast.FunctionDef):
            assert n.name in ('med','add','ac','append')
        elif isinstance(n,ast.ImportFrom):
            assert n.module in ('copy','clinical_data')
        elif isinstance(n,ast.Assign):
            value=expr(n.value)
            for target in n.targets:
                if isinstance(target,ast.Name): env[target.id]=value
                elif isinstance(target,ast.Subscript): expr(target.value)[expr(target.slice)]=value
                else: raise ValueError('Unsupported assignment')
        elif isinstance(n,ast.Expr): expr(n.value)
        elif isinstance(n,ast.For):
            assert isinstance(n.target,ast.Name)
            values=expr(n.iter)
            assert type(values) in (list,tuple) and len(values)<200
            for value in values:
                env[n.target.id]=value; statements(n.body)
        elif isinstance(n,ast.If): statements(n.body if expr(n.test) else n.orelse)
        else: raise ValueError('Unsupported data statement: '+ast.dump(n))

base=ast.parse((ROOT/'legacy/decompiled-candidates/clinical_data.py.txt').read_text())
statements(base.body)
env['BASE']=env['REGIMENS']; env['BASE_CARDS']=env['REFERENCE_CARDS']
catalogue=ast.parse((ROOT/'legacy/decompiled-candidates/catalogue.py.txt').read_text())
loop=catalogue.body[-1]
assert isinstance(loop,ast.For) and loop.target.id=='r'
inner=loop.body[0].body[0]
assert isinstance(inner,ast.If) and len(inner.body)==3
outside=inner.body[1:]; inner.body=inner.body[:1]
catalogue.body.extend(outside)
statements(catalogue.body)
result={key:env[key] for key in ('SOURCE_TITLE','REGIMENS','REFERENCE_CARDS','FIXED_ORAL_DOSES')}
target=Path(sys.argv[1])
target.parent.mkdir(parents=True,exist_ok=True)
target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('Recovered:',len(result['REGIMENS']),'regimens,',len(result['REFERENCE_CARDS']),'reference cards')
