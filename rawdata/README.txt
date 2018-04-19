Here is the raw CSV data for all of the nodes and edges for the parkview campus. 

For Windows: 
  1. Store both csv files inside of MongoDB\Server\3.6\bin directory (or where ever 'mongoimport.exe' is stored)
  2. Open a command prompt and cd into 'MongoDB\Server\3.6\bin'(or where ever 'mongoimport.exe' is stored)
  3. Run the following commands:
  
    mongoimport --db parkview --collection vertices --drop --type csv --headerline --file updatedcoords.csv
    mongoimport --db parkview --collection edges --drop --type csv --headerline --file updatededges.csv

  4. If successful, you should see something like the following being returned: 
  
    C:\Program Files\MongoDB\Server\3.6\bin>mongoimport --db parkview --collection vertices --drop --type csv --columnsHaveTypes --fields "id.int32(),xPos.double(),yPos.double(),floor.int32(),location.string(),name.string()" --file updatedcoords.csv
    2018-04-18T20:41:06.839-0400    connected to: localhost
    2018-04-18T20:41:06.841-0400    dropping: parkview.vertices
    2018-04-18T20:41:07.897-0400    imported 294 documents

    C:\Program Files\MongoDB\Server\3.6\bin>mongoimport --db parkview --collection edges --drop --type csv --columnsHaveTypes --fields "node1.int32(),node2.int32(),traveltype.string()" --file updatededges.csv
    2018-04-18T20:41:17.443-0400    connected to: localhost
    2018-04-18T20:41:17.444-0400    dropping: parkview.edges
    2018-04-18T20:41:18.471-0400    imported 303 documents
    
For Linux:
  1. No need to move the csv files anywhere or cd anywhere. Simply run the following commands in any directory that the .csv files are in:
  
     mongoimport --db parkview --collection vertices --drop --type csv --headerline --file updatedcoords.csv
     mongoimport --db parkview --collection edges --drop --type csv --headerline --file updatededges.csv

