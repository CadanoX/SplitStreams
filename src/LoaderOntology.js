import N3 from 'n3';
import SplitStreamInputData from './SplitStreamInputData';

export default class LoaderOntology {
  constructor() {
    this._stores = [];
    this._data = new SplitStreamInputData();
  }

  get data() {
    return this._data.data;
  }

  loadFile(filename) {
    let store = (this._stores[this._stores.length] = new N3.Store());
    const inputData = filename;
    const parser = new N3.Parser({
      baseIRI: 'http://purl.bioontology.org/ontology/ICD9CM/'
    });

    let quads = parser.parse(inputData);
    for (let quad of quads) store.addQuad(quad);
  }

  transformToTree() {
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
    this._data.buildTimeConnections();
    this._data.finalize();
  }

  _addQuadToTree(quad, t) {
    let { subject, object } = quad;
    this._data.addNode(t, subject.id);
    this._data.addNode(t, object.id);
    this._data.addParent(t, subject.id, object.id);
  }
}
