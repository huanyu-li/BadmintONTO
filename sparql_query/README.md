### SPARQL Query examples according to Competency Questions

[SPARQL Documentation](https://www.w3.org/TR/rdf-sparql-query/).

CQ1:
```
```

CQ2:
```
```

CQ3:
```
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX bo: <http://w3id.org/BadmintONTO/>

SELECT ?shottype (COUNT(?shottype) as ?num) WHERE {
	  ?s a bo:StrokeEvent .
    ?s bo:isDescribedBy ?info .
    ?info bo:hasShotType ?shottype .
    ?info bo:hittingPlayer ?player .   
    ?player bo:personFullName "SHI Yuqi" .
}
GROUP BY ?shottype
```

CQ4:
```
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX bo: <http://w3id.org/BadmintONTO/> 

SELECT ?num_to_point WHERE {
	  ?s a bo:RallyEvent .
    ?s bo:isDescribedBy ?info .
    ?info bo:getPointByPlayer ?player .   
    ?player bo:personFullName "SHI Yuqi" .
    ?info bo:shotNumber ?num_to_point .
}
Order By (?num_to_point)
```

CQ5:
```
```

CQ6:
```
```

CQ7:
```
```


