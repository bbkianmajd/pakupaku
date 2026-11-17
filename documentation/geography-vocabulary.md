# Geographic vocabulary

Implemented inventory: **50 US states**, **five city/place selections per state (250 memberships, 237 distinct city names)**, and **200 country/territory entities**. The vocabulary contains 535 distinct geographic spellings after aliases and cross-category deduplication.

“Most discussed” did not specify a source or time window. This is a broad inventory, not a measured discussion-frequency ranking: 193 UN members, Vatican City/Holy See and Palestine, plus Taiwan, Kosovo, Hong Kong, Macau and Western Sahara. These are vocabulary entries; inclusion does not express a position on recognition. Hawaii includes census-designated communities.

Names with spaces and punctuation are single semantic choices. The parser recognizes their component tokens, and the composer suggests continuations such as `salt` → `lake` → `city`. Alternate keys select a complete compatible singular noun phrase, which may now be a place, person or common-noun phrase; they do not independently exchange the words inside a place name. Country names requiring an article have ordinary forms such as `the united kingdom`; their bare forms remain available as standalone labels. Exact spelling, including aliases such as `st. paul`, survives author-key recovery.

Examples: `i live in north dakota.`, `meet me in salt lake city.`, `we live in the united kingdom.`, `i live in st. paul.`

## Inventory and provenance

The machine-readable catalog is [geography.json](../tools/vocabulary/geography.json). State/city selections are authored in [us-places.tsv](../tools/vocabulary/us-places.tsv); the capital is the first city in each row. The country snapshot and its ODbL license are retained in `tools/vocabulary/geography-sources/`. [The source manifest](../tools/vocabulary/geography-source.json) pins the data hash. The builder explicitly corrects the source’s Vatican City UN-member flag; Kosovo’s `UNK` is a source identifier, not an ISO assignment.

Sources: [country-name data and attribution](https://github.com/mledoze/countries), [UN members and observers](https://www.un.org/tr/node/44724), [state-capital reference](https://en.wikipedia.org/wiki/List_of_capitals_in_the_United_States), and [city/state reference](https://en.wikipedia.org/wiki/List_of_largest_cities_of_U.S._states_and_territories_by_population). City choices are not claimed to be the five largest cities.

## States and cities

| State | Capital | Four other cities/places |
| --- | --- | --- |
| Alabama | Montgomery | Birmingham, Huntsville, Mobile, Tuscaloosa |
| Alaska | Juneau | Anchorage, Fairbanks, Sitka, Ketchikan |
| Arizona | Phoenix | Tucson, Mesa, Chandler, Scottsdale |
| Arkansas | Little Rock | Fort Smith, Fayetteville, Springdale, Jonesboro |
| California | Sacramento | Los Angeles, San Diego, San Jose, San Francisco |
| Colorado | Denver | Colorado Springs, Aurora, Fort Collins, Boulder |
| Connecticut | Hartford | Bridgeport, New Haven, Stamford, Waterbury |
| Delaware | Dover | Wilmington, Newark, Middletown, Milford |
| Florida | Tallahassee | Jacksonville, Miami, Tampa, Orlando |
| Georgia | Atlanta | Augusta, Columbus, Savannah, Athens |
| Hawaii | Honolulu | Hilo, Kailua, Kaneohe, Pearl City |
| Idaho | Boise | Meridian, Nampa, Idaho Falls, Pocatello |
| Illinois | Springfield | Chicago, Aurora, Naperville, Rockford |
| Indiana | Indianapolis | Fort Wayne, Evansville, South Bend, Carmel |
| Iowa | Des Moines | Cedar Rapids, Davenport, Sioux City, Iowa City |
| Kansas | Topeka | Wichita, Overland Park, Kansas City, Olathe |
| Kentucky | Frankfort | Louisville, Lexington, Bowling Green, Owensboro |
| Louisiana | Baton Rouge | New Orleans, Shreveport, Lafayette, Lake Charles |
| Maine | Augusta | Portland, Lewiston, Bangor, South Portland |
| Maryland | Annapolis | Baltimore, Frederick, Gaithersburg, Rockville |
| Massachusetts | Boston | Worcester, Springfield, Cambridge, Lowell |
| Michigan | Lansing | Detroit, Grand Rapids, Warren, Ann Arbor |
| Minnesota | Saint Paul | Minneapolis, Rochester, Duluth, Bloomington |
| Mississippi | Jackson | Gulfport, Southaven, Hattiesburg, Biloxi |
| Missouri | Jefferson City | Kansas City, Saint Louis, Springfield, Columbia |
| Montana | Helena | Billings, Missoula, Great Falls, Bozeman |
| Nebraska | Lincoln | Omaha, Bellevue, Grand Island, Kearney |
| Nevada | Carson City | Las Vegas, Henderson, Reno, North Las Vegas |
| New Hampshire | Concord | Manchester, Nashua, Dover, Rochester |
| New Jersey | Trenton | Newark, Jersey City, Paterson, Elizabeth |
| New Mexico | Santa Fe | Albuquerque, Las Cruces, Rio Rancho, Roswell |
| New York | Albany | New York City, Buffalo, Rochester, Syracuse |
| North Carolina | Raleigh | Charlotte, Greensboro, Durham, Winston-Salem |
| North Dakota | Bismarck | Fargo, Grand Forks, Minot, West Fargo |
| Ohio | Columbus | Cleveland, Cincinnati, Toledo, Akron |
| Oklahoma | Oklahoma City | Tulsa, Norman, Broken Arrow, Lawton |
| Oregon | Salem | Portland, Eugene, Gresham, Bend |
| Pennsylvania | Harrisburg | Philadelphia, Pittsburgh, Allentown, Erie |
| Rhode Island | Providence | Warwick, Cranston, Pawtucket, East Providence |
| South Carolina | Columbia | Charleston, North Charleston, Mount Pleasant, Greenville |
| South Dakota | Pierre | Sioux Falls, Rapid City, Aberdeen, Brookings |
| Tennessee | Nashville | Memphis, Knoxville, Chattanooga, Clarksville |
| Texas | Austin | Houston, San Antonio, Dallas, Fort Worth |
| Utah | Salt Lake City | West Valley City, West Jordan, Provo, Orem |
| Vermont | Montpelier | Burlington, South Burlington, Rutland, Barre |
| Virginia | Richmond | Virginia Beach, Chesapeake, Norfolk, Alexandria |
| Washington | Olympia | Seattle, Spokane, Tacoma, Vancouver |
| West Virginia | Charleston | Huntington, Morgantown, Parkersburg, Wheeling |
| Wisconsin | Madison | Milwaukee, Green Bay, Kenosha, Racine |
| Wyoming | Cheyenne | Casper, Laramie, Gillette, Rock Springs |

## Countries and territories

The 200 entity names are listed below; the JSON catalog also contains alternate spellings.

- Afghanistan
- Albania
- Algeria
- Andorra
- Angola
- Antigua And Barbuda
- Argentina
- Armenia
- Australia
- Austria
- Azerbaijan
- Bahamas
- Bahrain
- Bangladesh
- Barbados
- Belarus
- Belgium
- Belize
- Benin
- Bhutan
- Bolivia
- Bosnia And Herzegovina
- Botswana
- Brazil
- Brunei
- Bulgaria
- Burkina Faso
- Burundi
- Cambodia
- Cameroon
- Canada
- Cape Verde
- Central African Republic
- Chad
- Chile
- China
- Colombia
- Comoros
- Congo
- Costa Rica
- Croatia
- Cuba
- Cyprus
- Czechia
- Dr Congo
- Denmark
- Djibouti
- Dominica
- Dominican Republic
- Ecuador
- Egypt
- El Salvador
- Equatorial Guinea
- Eritrea
- Estonia
- Eswatini
- Ethiopia
- Fiji
- Finland
- France
- Gabon
- Gambia
- Georgia
- Germany
- Ghana
- Greece
- Grenada
- Guatemala
- Guinea
- Guinea-Bissau
- Guyana
- Haiti
- Honduras
- Hong Kong
- Hungary
- Iceland
- India
- Indonesia
- Iran
- Iraq
- Ireland
- Israel
- Italy
- Ivory Coast
- Jamaica
- Japan
- Jordan
- Kazakhstan
- Kenya
- Kiribati
- Kosovo
- Kuwait
- Kyrgyzstan
- Laos
- Latvia
- Lebanon
- Lesotho
- Liberia
- Libya
- Liechtenstein
- Lithuania
- Luxembourg
- Macau
- Madagascar
- Malawi
- Malaysia
- Maldives
- Mali
- Malta
- Marshall Islands
- Mauritania
- Mauritius
- Mexico
- Micronesia
- Moldova
- Monaco
- Mongolia
- Montenegro
- Morocco
- Mozambique
- Myanmar
- Namibia
- Nauru
- Nepal
- Netherlands
- New Zealand
- Nicaragua
- Niger
- Nigeria
- North Korea
- North Macedonia
- Norway
- Oman
- Pakistan
- Palau
- Palestine
- Panama
- Papua New Guinea
- Paraguay
- Peru
- Philippines
- Poland
- Portugal
- Qatar
- Romania
- Russia
- Rwanda
- Saint Kitts And Nevis
- Saint Lucia
- Saint Vincent And The Grenadines
- Samoa
- San Marino
- Saudi Arabia
- Senegal
- Serbia
- Seychelles
- Sierra Leone
- Singapore
- Slovakia
- Slovenia
- Solomon Islands
- Somalia
- South Africa
- South Korea
- South Sudan
- Spain
- Sri Lanka
- Sudan
- Suriname
- Sweden
- Switzerland
- Syria
- São Tomé And Príncipe
- Taiwan
- Tajikistan
- Tanzania
- Thailand
- Timor-Leste
- Togo
- Tonga
- Trinidad And Tobago
- Tunisia
- Turkmenistan
- Tuvalu
- Türkiye
- Uganda
- Ukraine
- United Arab Emirates
- United Kingdom
- United States
- Uruguay
- Uzbekistan
- Vanuatu
- Vatican City
- Venezuela
- Vietnam
- Western Sahara
- Yemen
- Zambia
- Zimbabwe

## Reproduction and checks

Run `npm run vocabulary:stage2` to regenerate the catalog, dependency grammar, current vocabulary and matching pre-release archive offline. `tests/geography.test.js` checks inventory completeness, every geographic spelling through parser/render/composer, complete-name substitution at every geographic pool value, and author/alternate-key recovery. Browser cases exercise multiword states, countries, cities and abbreviated saint names. Existing language tests and the fixed benchmark are rerun after this expansion.

Verification at the geography checkpoint: **51 JavaScript tests**, **seven Python tests**, and **40 browser composer/worker cases** pass. The unchanged development benchmark remains **983/1,000 (98.3%)**, with **zero regressions** from the pre-geography snapshot. All 33 project cases pass; intact source notes remain 0/3. This retains the previously disclosed development-training and source-note limitations.
