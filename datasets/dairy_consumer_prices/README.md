Spark query on https://lindas.admin.ch/sparql/# :
```
PREFIX cube: <https://cube.link/>
PREFIX dim: <https://agriculture.ld.admin.ch/foag/dimension/>
PREFIX measure: <https://agriculture.ld.admin.ch/foag/measure/>
PREFIX schema: <http://schema.org/>

SELECT ?month ?product_subgroup ?production_type ?region ?price_value ?unit_name
WHERE {
  # 1. Target the Consumer Price Month cube
  <https://agriculture.ld.admin.ch/foag/cube/MilkDairyProducts/Consumption_Price_Month> cube:observationSet/cube:observation ?obs .
  
  # 2. Extract core data and the "hidden" differentiating dimensions
  ?obs dim:date ?dateURI ;
       dim:product-subgroup ?subgroupURI ;
       dim:production-system ?prodSystemURI ;
       dim:sales-region ?regionURI ;
       dim:unit ?unitURI ;
       measure:price ?price_value .
       
  # 3. Get labels for the product (e.g., Gruyère)
  OPTIONAL { ?subgroupURI schema:name ?product_subgroup . FILTER(LANG(?product_subgroup) = "fr") }

  # 4. Get labels for Production Type (e.g., Bio vs. Conventionnel)
  OPTIONAL { ?prodSystemURI schema:name ?production_type . FILTER(LANG(?production_type) = "fr") }

  # 5. Get labels for Region (e.g., Suisse romande vs. Suisse alémanique)
  OPTIONAL { ?regionURI schema:name ?region . FILTER(LANG(?region) = "fr") }

  # 6. Get labels for Unit
  OPTIONAL { ?unitURI schema:name ?unit_name . FILTER(LANG(?unit_name) = "fr") }
       
  # 7. Format the date
  BIND(REPLACE(STR(?dateURI), "https://ld.admin.ch/time/month/", "") AS ?month)
}
ORDER BY DESC(?month)
```
Query was developed using Gemini.
If the query does exceeds YASGUI storage limit, use this
[link](https://lindas.admin.ch/query?query=PREFIX%20cube%3A%20%3Chttps%3A%2F%2Fcube.link%2F%3E%0APREFIX%20dim%3A%20%3Chttps%3A%2F%2Fagriculture.ld.admin.ch%2Ffoag%2Fdimension%2F%3E%0APREFIX%20measure%3A%20%3Chttps%3A%2F%2Fagriculture.ld.admin.ch%2Ffoag%2Fmeasure%2F%3E%0APREFIX%20schema%3A%20%3Chttp%3A%2F%2Fschema.org%2F%3E%0A%0ASELECT%20%3Fmonth%20%3Fproduct_subgroup%20%3Fproduction_type%20%3Fregion%20%3Fprice_value%20%3Funit_name%0AWHERE%20%7B%0A%20%20%23%201.%20Target%20the%20Consumer%20Price%20Month%20cube%0A%20%20%3Chttps%3A%2F%2Fagriculture.ld.admin.ch%2Ffoag%2Fcube%2FMilkDairyProducts%2FConsumption_Price_Month%3E%20cube%3AobservationSet%2Fcube%3Aobservation%20%3Fobs%20.%0A%20%20%0A%20%20%23%202.%20Extract%20core%20data%20and%20the%20%22hidden%22%20differentiating%20dimensions%0A%20%20%3Fobs%20dim%3Adate%20%3FdateURI%20%3B%0A%20%20%20%20%20%20%20dim%3Aproduct-subgroup%20%3FsubgroupURI%20%3B%0A%20%20%20%20%20%20%20dim%3Aproduction-system%20%3FprodSystemURI%20%3B%0A%20%20%20%20%20%20%20dim%3Asales-region%20%3FregionURI%20%3B%0A%20%20%20%20%20%20%20dim%3Aunit%20%3FunitURI%20%3B%0A%20%20%20%20%20%20%20measure%3Aprice%20%3Fprice_value%20.%0A%20%20%20%20%20%20%20%0A%20%20%23%203.%20Get%20labels%20for%20the%20product%20(e.g.%2C%20Gruy%C3%A8re)%0A%20%20OPTIONAL%20%7B%20%3FsubgroupURI%20schema%3Aname%20%3Fproduct_subgroup%20.%20FILTER(LANG(%3Fproduct_subgroup)%20%3D%20%22fr%22)%20%7D%0A%0A%20%20%23%204.%20Get%20labels%20for%20Production%20Type%20(e.g.%2C%20Bio%20vs.%20Conventionnel)%0A%20%20OPTIONAL%20%7B%20%3FprodSystemURI%20schema%3Aname%20%3Fproduction_type%20.%20FILTER(LANG(%3Fproduction_type)%20%3D%20%22fr%22)%20%7D%0A%0A%20%20%23%205.%20Get%20labels%20for%20Region%20(e.g.%2C%20Suisse%20romande%20vs.%20Suisse%20al%C3%A9manique)%0A%20%20OPTIONAL%20%7B%20%3FregionURI%20schema%3Aname%20%3Fregion%20.%20FILTER(LANG(%3Fregion)%20%3D%20%22fr%22)%20%7D%0A%0A%20%20%23%206.%20Get%20labels%20for%20Unit%0A%20%20OPTIONAL%20%7B%20%3FunitURI%20schema%3Aname%20%3Funit_name%20.%20FILTER(LANG(%3Funit_name)%20%3D%20%22fr%22)%20%7D%0A%20%20%20%20%20%20%20%0A%20%20%23%207.%20Format%20the%20date%0A%20%20BIND(REPLACE(STR(%3FdateURI)%2C%20%22https%3A%2F%2Fld.admin.ch%2Ftime%2Fmonth%2F%22%2C%20%22%22)%20AS%20%3Fmonth)%0A%7D%0AORDER%20BY%20DESC(%3Fmonth)&format=csv).