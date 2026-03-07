Spark query on https://lindas.admin.ch/sparql/# :
```
PREFIX cube: <https://cube.link/>
PREFIX dim: <https://agriculture.ld.admin.ch/foag/dimension/>
PREFIX measure: <https://agriculture.ld.admin.ch/foag/measure/>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?month ?product_category ?exact_product ?origin ?production_type ?region ?price_value ?unit_name
WHERE {
  # 1. Target the Consumer Price Month cube
  <https://agriculture.ld.admin.ch/foag/cube/MilkDairyProducts/Consumption_Price_Month> cube:observationSet/cube:observation ?obs .
  
  # 2. Extract absolutely every dimension that influences the price
  ?obs dim:date ?dateURI ;
       dim:product-subgroup ?subgroupURI ;
       dim:product ?productURI ;             # The specific item
       dim:product-origin ?originURI ;       # Domestic vs Imported
       dim:production-system ?prodSystemURI ;
       dim:sales-region ?regionURI ;
       dim:unit ?unitURI ;
       measure:price ?price_value .
       
  # 3. Get labels in French (because English doesn't exist for these in the database!)
  OPTIONAL { ?subgroupURI schema:name | rdfs:label ?product_category . FILTER(LANG(?product_category) = "fr") }
  OPTIONAL { ?productURI schema:name | rdfs:label ?exact_product . FILTER(LANG(?exact_product) = "fr") }
  OPTIONAL { ?originURI schema:name | rdfs:label ?origin . FILTER(LANG(?origin) = "fr") }
  OPTIONAL { ?prodSystemURI schema:name | rdfs:label ?production_type . FILTER(LANG(?production_type) = "fr") }
  OPTIONAL { ?regionURI schema:name | rdfs:label ?region . FILTER(LANG(?region) = "fr") }
  OPTIONAL { ?unitURI schema:name | rdfs:label ?unit_name . FILTER(LANG(?unit_name) = "fr") }
       
  # 4. Clean up the Date format
  BIND(REPLACE(STR(?dateURI), "https://ld.admin.ch/time/month/", "") AS ?month)
}
ORDER BY DESC(?month)
```
Query was developed using Gemini.
If the query does exceeds YASGUI storage limit, use this
[link](https://lindas.admin.ch/query?query=PREFIX%20cube%3A%20%3Chttps%3A%2F%2Fcube.link%2F%3E%0APREFIX%20dim%3A%20%3Chttps%3A%2F%2Fagriculture.ld.admin.ch%2Ffoag%2Fdimension%2F%3E%0APREFIX%20measure%3A%20%3Chttps%3A%2F%2Fagriculture.ld.admin.ch%2Ffoag%2Fmeasure%2F%3E%0APREFIX%20schema%3A%20%3Chttp%3A%2F%2Fschema.org%2F%3E%0APREFIX%20rdfs%3A%20%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0A%0ASELECT%20%3Fmonth%20%3Fproduct_category%20%3Fexact_product%20%3Forigin%20%3Fproduction_type%20%3Fregion%20%3Fprice_value%20%3Funit_name%0AWHERE%20%7B%0A%20%20%23%201.%20Target%20the%20Consumer%20Price%20Month%20cube%0A%20%20%3Chttps%3A%2F%2Fagriculture.ld.admin.ch%2Ffoag%2Fcube%2FMilkDairyProducts%2FConsumption_Price_Month%3E%20cube%3AobservationSet%2Fcube%3Aobservation%20%3Fobs%20.%0A%20%20%0A%20%20%23%202.%20Extract%20absolutely%20every%20dimension%20that%20influences%20the%20price%0A%20%20%3Fobs%20dim%3Adate%20%3FdateURI%20%3B%0A%20%20%20%20%20%20%20dim%3Aproduct-subgroup%20%3FsubgroupURI%20%3B%0A%20%20%20%20%20%20%20dim%3Aproduct%20%3FproductURI%20%3B%20%20%20%20%20%20%20%20%20%20%20%20%20%23%20The%20specific%20item%0A%20%20%20%20%20%20%20dim%3Aproduct-origin%20%3ForiginURI%20%3B%20%20%20%20%20%20%20%23%20Domestic%20vs%20Imported%0A%20%20%20%20%20%20%20dim%3Aproduction-system%20%3FprodSystemURI%20%3B%0A%20%20%20%20%20%20%20dim%3Asales-region%20%3FregionURI%20%3B%0A%20%20%20%20%20%20%20dim%3Aunit%20%3FunitURI%20%3B%0A%20%20%20%20%20%20%20measure%3Aprice%20%3Fprice_value%20.%0A%20%20%20%20%20%20%20%0A%20%20%23%203.%20Get%20labels%20in%20French%20(because%20English%20doesn%27t%20exist%20for%20these%20in%20the%20database!)%0A%20%20OPTIONAL%20%7B%20%3FsubgroupURI%20schema%3Aname%20%7C%20rdfs%3Alabel%20%3Fproduct_category%20.%20FILTER(LANG(%3Fproduct_category)%20%3D%20%22fr%22)%20%7D%0A%20%20OPTIONAL%20%7B%20%3FproductURI%20schema%3Aname%20%7C%20rdfs%3Alabel%20%3Fexact_product%20.%20FILTER(LANG(%3Fexact_product)%20%3D%20%22fr%22)%20%7D%0A%20%20OPTIONAL%20%7B%20%3ForiginURI%20schema%3Aname%20%7C%20rdfs%3Alabel%20%3Forigin%20.%20FILTER(LANG(%3Forigin)%20%3D%20%22fr%22)%20%7D%0A%20%20OPTIONAL%20%7B%20%3FprodSystemURI%20schema%3Aname%20%7C%20rdfs%3Alabel%20%3Fproduction_type%20.%20FILTER(LANG(%3Fproduction_type)%20%3D%20%22fr%22)%20%7D%0A%20%20OPTIONAL%20%7B%20%3FregionURI%20schema%3Aname%20%7C%20rdfs%3Alabel%20%3Fregion%20.%20FILTER(LANG(%3Fregion)%20%3D%20%22fr%22)%20%7D%0A%20%20OPTIONAL%20%7B%20%3FunitURI%20schema%3Aname%20%7C%20rdfs%3Alabel%20%3Funit_name%20.%20FILTER(LANG(%3Funit_name)%20%3D%20%22fr%22)%20%7D%0A%20%20%20%20%20%20%20%0A%20%20%23%204.%20Clean%20up%20the%20Date%20format%0A%20%20BIND(REPLACE(STR(%3FdateURI)%2C%20%22https%3A%2F%2Fld.admin.ch%2Ftime%2Fmonth%2F%22%2C%20%22%22)%20AS%20%3Fmonth)%0A%7D%0AORDER%20BY%20DESC(%3Fmonth)&format=csv).