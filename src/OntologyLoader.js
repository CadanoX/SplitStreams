import N3 from 'n3';
import SecStreamInputData from '../src/SecStreamInputData';

export default class OntologyLoader {
  constructor() {
    this._stores = [];
    this._data = new SecStreamInputData();
  }

  get data() {
    return this._data.data;
  }

  loadOntology(filename) {
    let store = (this._stores[this._stores.length] = new N3.Store());
    const inputData = filename;
    const parser = new N3.Parser({
      baseIRI: 'http://purl.bioontology.org/ontology/ICD9CM/'
    });

    let quads = parser.parse(inputData);
    for (let quad of quads) store.addQuad(quad);
  }

  transformOntologiesToTree() {
    for (let [i, store] of this._stores.entries()) {
      //this._store.getQuads(undefined, 'http://purl.bioontology.org/ontology/ICD9CM/SIB', undefined, undefined);
      // store.forEach((d) => this._addQuadToTree(d, i), undefined, 'http://www.w3.org/2000/01/rdf-schema#subClassOf', undefined, undefined);
      let relations = store.getQuads(
        undefined,
        'http://www.w3.org/2000/01/rdf-schema#subClassOf',
        undefined,
        undefined
      );
      for (let quad of relations) {
        this._addQuadToTree(quad, i);
      }
    }
    this._data._buildTimeConnections();
    this._data.finalize();
  }

  _addQuadToTree(quad, t) {
    let { subject, object } = quad;
    this._data.addNode(t, subject.id);
    this._data.addNode(t, object.id);
    this._data.addParent(t, subject.id, object.id);
  }
}
