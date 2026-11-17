"""Build the reviewed geographic inventory from pinned data and authored city choices."""
import json,hashlib,pathlib
p=pathlib.Path(__file__).resolve().parent
source=json.loads((p/'geography-source.json').read_text())
raw=(p/source['file']).read_bytes()
assert hashlib.sha256(raw).hexdigest()==source['sha256']
source_countries=json.loads(raw)
# This snapshot flags Vatican City as unMember; classify it as an observer-state
# place explicitly instead. Kosovo's source code is UNK, not an ISO assignment.
members=[c for c in source_countries if c['unMember'] and c['cca3']!='VAT'];assert len(members)==193
chosen=[c for c in source_countries if c in members or c['cca3'] in {'VAT','PSE','TWN','UNK','HKG','MAC','ESH'}];assert len(chosen)==200
aliases={'USA':['usa','us','united states of america','the united states of america'], 'GBR':['uk','britain','great britain'], 'CZE':['czech republic','the czech republic'], 'CIV':["côte d'ivoire",'côte d’ivoire',"cote d'ivoire"], 'SWZ':['swaziland'], 'TUR':['türkiye','turkiye'], 'MMR':['burma'], 'CPV':['cape verde'], 'TLS':['east timor'], 'VAT':['holy see','the holy see'], 'COD':['democratic republic of the congo','the democratic republic of the congo','drc'], 'COG':['republic of the congo','the republic of the congo','congo-brazzaville'], 'MAC':['macao'], 'KOR':['republic of korea','the republic of korea'], 'PRK':['dprk'], 'RUS':['russian federation','the russian federation'], 'FSM':['federated states of micronesia','the federated states of micronesia'], 'VNM':['viet nam']}
articles={'USA','GBR','NLD','BHS','PHL','ARE','CAF','MHL','SLB','GMB'}
countries=[]
for c in sorted(chosen,key=lambda c:c['name']['common']):
 name=c['name']['common'].lower();names=[name,*aliases.get(c['cca3'],[])]
 if c['cca3'] in articles:names.insert(0,'the '+name)
 countries.append(dict(code=c['cca3'],name=name,kind='country' if c in members else 'observer-state-place' if c['cca3'] in {'VAT','PSE'} else 'additional-place',spellings=list(dict.fromkeys(names))))
states=[]
for line in (p/'us-places.tsv').read_text().splitlines():
 state,capital,*cities=line.lower().split('\t');states.append(dict(name=state,capital=capital,cities=[capital,*cities]))
assert len(states)==50 and all(len(set(s['cities']))==5 for s in states)
extra={'saint paul':['st. paul','st paul'],'saint louis':['st. louis','st louis'],'new york city':['nyc'],'boise':['boise city']}
catalog=dict(selection='50 US states; five cities/places per state including its capital. 200 country/territory entities: 193 UN members, two observer-state places, plus Taiwan, Kosovo, Hong Kong, Macau and Western Sahara. Broad coverage, not a measured discussion-frequency ranking or a statement on political recognition. Hawaii includes census-designated communities.',sources=[source,dict(url='https://en.wikipedia.org/wiki/List_of_capitals_in_the_United_States',use='Capital fact check'),dict(url='https://en.wikipedia.org/wiki/List_of_largest_cities_of_U.S._states_and_territories_by_population',use='City spelling and state membership reference; authored selection, not a population ranking')],states=states,countries=countries,city_aliases=extra)
(p/'geography.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
print('50 states, 250 state/city memberships,',len(set(c for s in states for c in s['cities'])),'unique cities, 200 country/territory entities')
