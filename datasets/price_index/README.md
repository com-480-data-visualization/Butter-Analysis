Baseline year is 2005=100, with 71.04 Rp./kg (https://www.news.admin.ch/de/nsb?id=28046)

Spark query on https://lindas.admin.ch/sparql/# :
```
PREFIX cube: <https://cube.link/>
PREFIX dim: <https://agriculture.ld.admin.ch/foag/dimension/>
PREFIX measure: <https://agriculture.ld.admin.ch/foag/measure/>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?month ?product_group ?product_subgroup ?price_index_value
WHERE {
  # 1. Target the poorly-named FOAG cube
  <https://agriculture.ld.admin.ch/foag/cube/MilkDairyProducts/Production_Index_Month> cube:observationSet/cube:observation ?obs .
  
  # 2. Extract Date, Group, Subgroup, and the Price Index Value
  ?obs dim:date ?dateURI ;
       dim:product-group ?groupURI ;
       dim:product-subgroup ?subgroupURI ;
       measure:index ?price_index_value .
       
  # 3. Get the human-readable names for the Group
  OPTIONAL {
    ?groupURI schema:name | rdfs:label ?product_group .
    FILTER(LANG(?product_group) = "fr") 
  }

  # 4. Get the human-readable names for the Subgroup
  OPTIONAL {
    ?subgroupURI schema:name | rdfs:label ?product_subgroup .
    FILTER(LANG(?product_subgroup) = "fr") 
  }
       
  # 5. Clean up the Date format for your CSV
  BIND(REPLACE(STR(?dateURI), "https://ld.admin.ch/time/month/", "") AS ?month)
}
ORDER BY DESC(?month)
```
Query was developed using Gemini.