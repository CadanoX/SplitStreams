/* This is a node.js script to transform the available datasets into the SecStreamInputData format */

// get meta information about all datasets
const datasetList = require('../_datasets.json');

async function loadDataset(name) {
  let file = datasetList[name];
  if (!datasets[name]) {
    let data;
    let response;

    if (file.format == 'ontology') {
      // case 'ontology':
      //   let ont = new OntologyLoader();
      //   ont.loadOntology(examples.ontologies.ICD9CM_2013AB);
      //   ont.loadOntology(examples.ontologies.ICD9CM_2014AB);
      //   ont.transformOntologiesToTree();
      //   datasets.ontology = ont.data;
      //   break;
    }
    else {
      try {
        if (file.format == 'treemap') response = await fetch(`./data/treemaps/${name}.${file.filetype}`);
        else response = await fetch(`./data/${name}.${file.filetype}`);
      } catch (e) {
        alert(e);
        return false;
      }

      try {
        if (file.filetype == 'json')
          data = await response.json();
        else if (file.filetype == 'csv')
          data = Papa.parse(await response.text(),
            { header: true }
          ).data;
        else if (file.filetype == 'data')
          data = Papa.parse(await response.text()).data;
        else
          throw Exception('File format not supported.');

        datasets[name] = TransformData[file.format](data);
        return true;
      } catch (e) {
        alert(e);
        return false;
      }
    }
  }
  return true;
}