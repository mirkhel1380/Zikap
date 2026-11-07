"""Check public page metadata, sitemap coverage and local navigation. Stdlib only."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,xml.etree.ElementTree as ET,struct
R=Path(__file__).resolve().parents[1]; BASE='https://mirkhel1380.github.io/Zikap/'
class Page(HTMLParser):
 def __init__(self,p):
  super().__init__(convert_charrefs=True);self.tags=[];self.ids=[];self.structured=[];self.ld=False;self.buf='';self.feed(p.read_text())
 def handle_starttag(self,t,a):
  a=dict(a);self.tags.append((t,a))
  if 'id' in a:self.ids.append(a['id'])
  if t=='script' and a.get('type')=='application/ld+json':self.ld=True;self.buf=''
 def handle_data(self,d):
  if self.ld:self.buf+=d
 def handle_endtag(self,t):
  if t=='script' and self.ld:self.structured.append(json.loads(self.buf));self.ld=False
 def meta(self,k):return [a.get('content','') for t,a in self.tags if t=='meta' and (a.get('name')==k or a.get('property')==k)]
 def links(self,rel):return [a['href'] for t,a in self.tags if t=='link' and a.get('rel')==rel]
pages={p.name:Page(p) for p in R.glob('*.html')};public={n:p for n,p in pages.items() if not any('noindex' in x for x in p.meta('robots'))}
urls={x.text for x in ET.parse(R/'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')}
assert urls=={BASE+('' if n=='index.html' else n) for n in public},'sitemap coverage'
for n,p in pages.items():
 assert len(p.ids)==len(set(p.ids)),f'{n}: duplicate IDs'
 assert sum(t=='h1' for t,a in p.tags)==1,f'{n}: H1'
 for t,a in p.tags:
  for k in ('href','src'):
   if k not in a:continue
   u=urlsplit(a[k])
   if u.scheme or u.netloc:continue
   path=unquote(u.path)
   if n=='404.html' and path:assert path.startswith('/Zikap/'),(n,path)
   target=path.removeprefix('/Zikap/') if path.startswith('/Zikap/') else path
   target=target or n
   if target.endswith('/'):target+='index.html'
   q=R/target;assert q.is_file(),(n,a[k])
   if u.fragment and q.suffix=='.html':assert u.fragment in pages[q.name].ids,(n,a[k])
for n,p in public.items():
 canonical=BASE+('' if n=='index.html' else n)
 assert p.links('canonical')==[canonical],n
 assert p.meta('og:url')==[canonical],n
 assert p.meta('og:image')==[BASE+'assets/zikap-social.png'],n
 assert p.meta('twitter:card')==['summary_large_image'],n
 assert p.meta('og:image:width')==['1200'] and p.meta('og:image:height')==['630'],n
 assert len(p.meta('description'))==1 and len(p.structured)==1,n
 graph=p.structured[0]['@graph'];assert any(x['@type']=='WebPage' and x['url']==canonical for x in graph),n
 for x in graph:
  if x['@type']=='BreadcrumbList':
   items=x['itemListElement'];assert len(items)>=2 and [i['position'] for i in items]==list(range(1,len(items)+1)),n
   assert items[-1]['item']==canonical,n
assert '404.html' not in public and not pages['404.html'].links('canonical')
assert struct.unpack('>II',(R/'assets/zikap-social.png').read_bytes()[16:24])==(1200,630)
assert len({p.meta('description')[0] for p in public.values()})==len(public)
print(f'PASS: {len(public)} indexable pages; sitemap, metadata, structured data, all root-page local links/anchors, nested-safe 404 and 1200x630 sharing image.')
