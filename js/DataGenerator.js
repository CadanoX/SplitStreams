{
    class DataGenerator {
        constructor(
            {
                options: opts = {
                    timesteps: 0,
                    maxDepth: 0,
                    maxChildren: 0,
                    numMerges: 0,
                    numSplits: 0,
                    numMoveAcross: 0,
                    numMoveAlong: 0,
                    numStreams: 0,
                    numAdds: 0,
                    numDeleted: 0
                }
            } = {})
        {
			this._opts = opts;

            this._data = {
                N: {},
                EN: {},
                ET: {}
            };

            this._id;
            this._numNodes = 0;
        }

        options(opts) { Object.assign(this._opts, opts); }
    
        generate() {
            this._clear();
            this._genStreams();
            this._genTimesteps();
            this._genDepth();
            this._genChildren();
            this._genMerges();
            this._genSplits();
            this._genMoveAcross();
            this._genMoveAlong();
            this._genAdds();
            this._genDeleted();
        }

        get() {
            return this._data;
        }

        _clear() {
            this._id = 0;
            this._numNodes = 0;
            this._data = {
                N: {},
                EN: {},
                ET: {}
            };
        }

        _uniqueID() {
            return this._id++;
        }
        
        _genStreams() {
            let {numStreams, timesteps} = this._opts;
            let {N,EN,ET} = this._data;

            for (let t = 0; t < timesteps-1; t++)
                ET[t] = {};

            for (let n = 0; n < numStreams; n++) {
                let lastId;
                for (let t = 0; t < timesteps; t++) {
                    let id = this._uniqueID();
                    // create Node
                    N[id] = { t: t }
                    this._numNodes++;
                    // create history
                    if (t != timesteps - 1)
                         ET[t][id] = [];
                    if (t != 0)
                        ET[t-1][lastId].push(id);
                    lastId = id;
                }
            }
        }

        _genTimesteps() {

        }

        _genDepth() {
            let {numStreams, timesteps} = this._opts;
            let {N,EN,ET} = this._data;
            for (let t = 0; t < timesteps; t++) {
                EN[t] = {};
            }
            let nodes = Object.entries(N);
            for (let n = 0; n < nodes.length; n++) {
                let key = nodes[n][0];
                let entry = nodes[n][1];
                EN[entry.t][key] = [];
                entry.l = 0;
            }
        }

        _genChildren() {

        }

        _genMerges() {

        }

        _genSplits() {

        }

        _genMoveAcross() {

        }

        _genMoveAlong() {

        }

        _genAdds() {

        }

        _genDeleted() {

        }
    }
	window.DataGenerator = (...args) => new DataGenerator(...args);
}