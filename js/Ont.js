{
    const N3 = require('n3');

    class OntologyLoader {
        constructor() {
            this._store = new N3.Store();
        }

        loadOntologies() {
            const parser = new N3.Parser({ baseIRI: 'http://purl.bioontology.org/ontology/ICD9CM/' });
            let countQuads = 0;
            parser.parse(ontologies.ICD9CM_2014AB, (error, quad, prefixes) => {
                if (quad)
                    this._addQuadToTree(quad);
                else
                    console.log("#END", prefixes);
            });
            console.log(countQuads);
        }

        _addQuadToTree(quad) {
            this._store.addQuad(quad);
            //console.log(quad);
        }

        _doStuff() {
            this._store.getQuads(undefined, 'http://purl.bioontology.org/ontology/ICD9CM/SIB', undefined, undefined);
        }
    }

    module.exports = { OntologyLoader };
}