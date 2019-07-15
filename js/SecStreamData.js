
//const SvgPath = require('SvgPath');
{
    class SecStreamData {
		// array of streams
		// every stream has a unique ID
		// every stream contains references to all nodes which belong to that stream


		// if parent never changes, draw stream after parent
		// if parent changes, draw after both parents.
		// if special case, split path in 2 and draw before and after
		constructor() {
			this._streamNodes = [];
			this._streams = [];
			this._splits = {};
			this._xScale = d => d;
			this._yScale = d => d;
			this._proportion = 1;

			this._xCurve = "bezier"; // linear, bezier
			this._startEnd = {
				encoding: "plug", // circle, plug, default
				x: 0.85,
				y: 0
			};
		}
	
		get streams() { return this._streams; }
		get clipPaths() { return this._clipPaths; }
		get splits() { return  Object.keys(this._splits); }

		set xScale(callback) { this._xScale = callback; }
		set yScale(callback) { this._yScale = callback; }
		set startEndEncoding(encoding) { this._startEnd.encoding = encoding; }
		set startEndEncodingX(x) { this._startEnd.x = x; }
		set startEndEncodingY(y) { this._startEnd.y = y; }
		set proportion(p) { this._proportion = p; }

		add(node) {
			this._streamNodes.push(node);
		}

		clear() {
			this._streamNodes = [];
			this._streams = [];
			this._clipPaths = [];
        }
        
		addSplits(splits) {
			if(Array.isArray(splits))
				splits.forEach((d) => {
					this._splits[d] = true;
				})
			else
				this._splits[d] = true;
		}

		removeSplits(splits) {
			if (!splits)
				this._splits = {};
			else
				splits.forEach((d) => {
					this._splits[d].remove();
				})
		}

		//TODO: find more elaborate solution
		_findSplits(t0, t1) {
			let splits = [];
			for (let split in this._splits) {
				if (split >= t0 && split <= t1)
					splits.push(+split);
			}
			return splits;
        }
        
        _findClosestNode(stream, x) {
            let traverseTime = function(node) {
                let distance = Math.abs(node.x - x);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestNode = node;
                    // if distance is greater than minDistance, it will only increase with following nodes
                    if (!!node.next) {
                        node.next.forEach(traverseTime);
                    }
                }
            }
            let minDistance = Infinity;
            let closestNode;
            traverseTime(stream);
            return closestNode;
        }

        // WARNING: work in process
		_checkForNullStreams() {
			for (let i = 0; i < this._streamNodes.length; i++) {
				let isNull = true;

				let traverse = (node) => {
					if ((node.y1 - node.y0) > 0) {
						isNull = false;
						return;
					}

                    if (!!node.next)
					    node.next.forEach(traverse);
				}

				traverse(this._streamNodes[i]);

				if (isNull) {
                    delete this._streamNodes[i];//delete stream;
                    i--;
                }
			}
		}

        _drawStart(path, node) {
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            // extend to left
            d.move(x(node.x), y(node.y1));

            // don't draw start for zero values
            if ((node.y1 - node.y0) <= 0)
                return;

            let t = node.x - 0.5*(1-prop);
            d.horizontal(x(t));

            // connect top and bottom
            let root = node;
            while(!!root.parent)
                root = root.parent

            if (!root.prev) { // make first timestep flat
                d.vertical(y(node.y0));
            }
            else {
                if (this._startEnd.encoding == "circle")
                    this._drawStartCircle(d, node);
                else if (this._startEnd.encoding == "plug")
                    this._drawStartPlug(d, node);
                else
                    this._drawStartDefault(d, node);
            }

            // connect back
            d.horizontal(x(node.x));
        }

        _drawEnd(path, node) {
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            if ((node.y1 - node.y0) <= 0)
                return;

            // extend to right
            let t = node.x + 0.5*(1-prop);
            d.horizontal(x(t));

            // connect bottom and top
            let root = node;
            while(!!root.parent)
                root = root.parent
            if (!root.next) { // make last timestep flat
                d.vertical(y(node.y1));
            }
            else {
                if (this._startEnd.encoding == "circle")
                    this._drawEndCircle(d, node);
                else if (this._startEnd.encoding == "plug")
                    this._drawEndPlug(d, node);
                else
                    this._drawEndDefault(d, node);
            }
            
            // connect back
            d.horizontal(x(node.x));
        };

        _drawStartDefault(path, node) { // insert node
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            // find position to insert node
            let pos;
            // find the oldest parent of node, which does not exist in the previous step
            let parentNoPrev = node;
            while(!!parentNoPrev.parent && !parentNoPrev.parent.prev)
                parentNoPrev = parentNoPrev.parent;

            // p is an ancestor who existed in the previous timestep
            let p = parentNoPrev.parent;
            if (!p) {
                d.vertical(y(node.y0))
            }
            else {
                // use the center of the stream as reference point
                let mid = 0.5 * (parentNoPrev.y0 + parentNoPrev.y1);
                
                // if the nodes parent has multiple previous nodes, find the one closest to mid
                let refPrevId = -1;
                for (let n = 0; n < p.prev.length && refPrevId == -1; n++) {
                    let prev = p.prev[n];
                    // if mid lies within a prev node
                    if (prev.y0 <= mid && prev.y1 >= mid) {
                        // if node has children
                        if (!!prev.children && prev.children.length > 0) {
                            let refChildId = -1;// find two children to put the mid in between
                            for (let i = 0; i < prev.children.length && refChildId == -1; i++) {
                                let child = prev.children[i];
                                if (mid <= 0.5 * (child.y0 + child.y1))
                                    refChildId = i; // setting ID breaks the loop
                            }
                            if (refChildId == 0) // before first child
                                pos = 0.5 * (prev.y0 + prev.children[0].y0);
                            else if (refChildId == -1) // after last child
                                pos = 0.5 * (prev.y1 + prev.children[prev.children.length-1].y1);
                            else
                                pos = 0.5 * (prev.children[refChildId-1].y1 + prev.children[refChildId].y0);
                        }
                        else // node has no children
                            pos = 0.5 * (prev.y0 + prev.y1);
                        refPrevId = -2; // setting ID breaks the loop
                    }
                    // if it lies outside, find two nodes to put it inbetween
                    else {
                        if (mid <= 0.5 * (prev.y0 + prev.y1))
                            refPrevId = n; // setting ID breaks the loop
                    }
                }

                if (refPrevId != -2) { // if -2, then pos was already set
                    let node; // define the node to draw inside
                    let first; // boolean to define if it should be drawn before the first or after the last child
                    if (refPrevId == 0) { // before first child
                        node = p.prev[0];
                        first = true;
                    }
                    else if (refPrevId == -1) { // after last child
                        node = p.prev[p.prev.length-1];
                        first = false;
                    }
                    else {
                        // find which node is closer
                        if (Math.abs(p.prev[refPrevId].y0 - mid) < Math.abs(p.prev[refPrevId-1].y1)) {
                            node = p.prev[refPrevId];
                            first = true;
                        }
                        else {
                            node = p.prev[refPrevId-1];
                            first = false;
                        }
                    }

                    if (!!node.children && node.children.length > 0) {
                        if (first)
                            pos = 0.5 * (node.y0 + node.children[0].y0);
                        else
                            pos = 0.5 * (node.y1 + node.children[node.children.length-1].y1);
                    }
                    else
                        pos = 0.5 * (node.y0 + node.y1);
                }

                let tdiff = node.x - p.prev[0].x;
                let t0 = node.x - 0.5 * (1-prop) * tdiff;
                let t1 = t0 - 0.5 * prop * tdiff;

                if (this._xCurve == "linear") {
                    d.line(x(p.prev[0].x), y(pos));
                    d.line(x(t0), y(node.y0))
                }
                else if (this._xCurve == "bezier") {
                    d.bezier(x(t1), y(node.y1),
                            x(t1), y(pos),
                            x(p.prev[0].x), y(pos));
                    d.bezier(x(t1), y(pos),
                            x(t1), y(node.y0),
                            x(t0), y(node.y0));
                }
            }
        };

        _drawEndDefault(path, node) {
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            // find position to delete node to
            let pos;
            // find the oldest parent of node, which does not exist in the next step
            let parentNoNext = node;
            while(!!parentNoNext.parent && !parentNoNext.parent.next)
                parentNoNext = parentNoNext.parent; // p is the oldest parent of node, which does not exist in the next step

            // p is an ancestor who exists in the next timestep
            let p = parentNoNext.parent;
            if (!p) {
                d.vertical(y(node.y1))
            }
            else {
                // use the center of the stream as reference point
                let mid = 0.5 * (parentNoNext.y0 + parentNoNext.y1);
                // if the nodes parent has multiple next nodes, find the one closest to mid
                let refNextId = -1;
                for (let n = 0; n < p.next.length && refNextId == -1; n++) {
                    let next = p.next[n];
                    // if mid lies within a next node
                    if (next.y0 <= mid && next.y1 >= mid) {
                        // if node has children
                        if (!!next.children && next.children.length > 0) {
                            let refChildId = -1;// find two children to put the mid in between
                            for (let i = 0; i < next.children.length && refChildId == -1; i++) {
                                let child = next.children[i];
                                if (mid <= 0.5 * (child.y0 + child.y1))
                                    refChildId = i; // setting ID breaks the loop
                            }
                            if (refChildId == 0) // before first child
                                pos = 0.5 * (next.y0 + next.children[0].y0);
                            else if (refChildId == -1) // after last child
                                pos = 0.5 * (next.y1 + next.children[next.children.length-1].y1);
                            else
                                pos = 0.5 * (next.children[refChildId-1].y1 + next.children[refChildId].y0);
                        }
                        else // node has no children
                            pos = 0.5 * (next.y0 + next.y1);
                        refNextId = -2; // setting ID breaks the loop
                    }
                    // if it lies outside, find two nodes to put it inbetween
                    else {
                        if (mid <= 0.5 * (next.y0 + next.y1))
                            refNextId = n; // setting ID breaks the loop
                    }
                }

                if (refNextId != -2) { // if -2, then pos was already set
                    let node; // define the node to draw inside
                    let first; // boolean to define if it should be drawn before the first or after the last child
                    if (refNextId == 0) { // before first child
                        node = p.next[0];
                        first = true;
                    }
                    else if (refNextId == -1) { // after last child
                        node = p.next[p.next.length-1];
                        first = false;
                    }
                    else {
                        // find which node is closer
                        if (Math.abs(p.next[refNextId].y0 - mid) < Math.abs(p.next[refNextId-1].y1)) {
                            node = p.next[refNextId];
                            first = true;
                        }
                        else {
                            node = p.next[refNextId-1];
                            first = false;
                        }
                    }

                    if (!!node.children && node.children.length > 0) {
                        if (first)
                            pos = 0.5 * (node.y0 + node.children[0].y0);
                        else
                            pos = 0.5 * (node.y1 + node.children[node.children.length-1].y1);
                    }
                    else
                        pos = 0.5 * (node.y0 + node.y1);
                        
                }

                let tdiff = p.next[0].x - node.x;
                let t0 = node.x + 0.5 * (1-prop) * tdiff;
                let t1 = t0 + 0.5 * prop * tdiff;

                if (this._xCurve == "linear") {
                    d.line(x(p.next[0].x), y(pos));
                    d.line(x(t0), y(node.y1))
                }
                else if (this._xCurve == "bezier") {
                    d.bezier(x(t1), y(node.y0),
                            x(t1), y(pos),
                            x(p.next[0].x), y(pos));
                    d.bezier(x(t1), y(pos),
                            x(t1), y(node.y1),
                            x(t0), y(node.y1));
                }
            }
        };

        _drawStartCircle(path, node) {
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            let height = node.y1 - node.y0;
            let t = node.x - 0.5*(1-prop);	
            d.move(x(t), y(node.y1));
            //d.arc(Math.log(height), 1, 0, 0, 0, x(node.x), y(node.y0));
            d.arc(prop, 1, 0, 0, 0, x(t), y(node.y0));
        };

        _drawEndCircle(path, node) {
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            let height = node.y1 - node.y0;
            let t = node.x + 0.5*(1-prop);
            //d.arc(Math.log(height), 1, 0, 0, 0, x(node.x), y(node.y1));
            d.arc(prop, 1, 0, 0, 0, x(t), y(node.y1));
        };

        _drawStartPlug(path, node) {	
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            let t = node.x - 0.5*(1-prop);				
            let height = node.y1 - node.y0;
            d.bezier(x(t - prop * this._startEnd.x * Math.sqrt(height)), y(node.y1 + this._startEnd.y * height),
                     x(t - prop * this._startEnd.x * Math.sqrt(height)), y(node.y0 - this._startEnd.y * height), 
                     x(t), y(node.y0));
        };

        _drawEndPlug(path, node) {
            const d = path, prop = this._proportion, x = this._xScale, y = this._yScale;
            
            let t = node.x + 0.5*(1-prop);
            let height = node.y1 - node.y0;
            d.bezier(x(t + prop * this._startEnd.x * Math.sqrt(height)), y(node.y0 - this._startEnd.y * height),
                     x(t + prop * this._startEnd.x * Math.sqrt(height)), y(node.y1 + this._startEnd.y * height), 
                     x(t), y(node.y1));
        };

		calculatePaths() {
			//this._checkForNullStreams();

			const prop = this._proportion, x = this._xScale, y = this._yScale;
            let d, lastTimepoint, deepestDepth; // find the deepest depth each stream has over the whole timeseries

            let drawLine = (t1, t2, t3, ySource, yDest) => {
                let t12 = 0.5 * (t1 + t2) // mid between t1 and t2
                d.horizontal(t1);
                if (this._xCurve == "linear") {
                    d.line(t2, y(yDest))
                }
                else if (this._xCurve == "bezier") {
                    d.bezier(t12, y(ySource),
                                t12, y(yDest),
                                t2, y(yDest));
                }
                d.horizontal(t3);
            };

            let traverse = (node) => {
                if (node.x > lastTimepoint)
                    lastTimepoint = node.x;
                
                if (node.depth > deepestDepth)
                    deepestDepth = node.depth;

                if (!!node.next) {

                    let dt = node.next[0].x - node.x;
                    let t0 = x(node.x);
                    let t1 = x(node.x + 0.5 * (1-prop) * dt);
                    let t2 = x(node.next[0].x - 0.5 * (1-prop) * dt);
                    let t3 = x(node.next[0].x);

                    for (let i = 0; i < node.next.length; i++) {
                        //let y0 = node.y0 + i * (node.y1 - node.y0) / node.next.length;
                        //let y1 = node.y0 + (i+1) * (node.y1 - node.y0) / node.next.length;
                        let y0 = node.y0;
                        let y1 = node.y1;
                        let dest = node.next[i];

                        // don't draw anything for streams with zero height
                        if ((y1 - y0) <= 0 && (dest.y1 - dest.y0) <= 0) {
                            d.move(t3, y(dest.y0));
                            traverse(dest);
                            d.move(t0, y(y0));
                        }
                        else {
                            drawLine(t1, t2, t3, y0, dest.y0); // bottom line (forwards)
                            traverse(dest);
                            drawLine(t2, t1, t0, dest.y1, y1); // top line (backwards)
                        }
                    }
                }
                else // end stream
                    this._drawEnd(d, node);
            };

			for(let stream of this._streamNodes) {
				d = SvgPath();
                lastTimepoint = 0;
                deepestDepth = 0;

				this._drawStart(d, stream)
				traverse(stream);

				// add splits

				//d.close();
				//console.log(d.get());


				let clipPath = SvgPath();
				let splits = this._findSplits(stream.x - 0.5, lastTimepoint + 0.5);

                let clipStart = x(-1);
                let y0 = y(0);
                let y1 = y(1);
				for (let split of splits) {                    
                    // we move by 0.0001 to avoid cases in which the split is in the middle of 2 nodes
                    let clipEnd = x(split - 0.5 * this._findClosestNode(stream, split-0.0001).marginX);
                    
					if (clipEnd - clipStart > 0) {
						clipPath.move(clipStart, y0);
                        clipPath.horizontal(clipEnd);
                        clipPath.vertical(y1);
                        /*let dist = y1-y0;
                        let zigzags = 300;
                        let zigzagWidth = 5;
                        for (let z = 0; z < zigzags; z++) {
                            let dir = (z % 2 * 2 - 1);
                            clipPath.lineD(dir * zigzagWidth, dist/zigzags)
                        }*/

                        
						clipPath.horizontal(clipStart);
						clipPath.vertical(y0);
                        /*for (let z = 0; z < zigzags; z++) {
                            let dir = (z % 2 * 2 - 1);
                            clipPath.lineD(dir * zigzagWidth, -dist/zigzags)
                        }*/
					}
                    clipStart = x(split + 0.5 * this._findClosestNode(stream, split+0.0001).marginX);
				}
				clipPath.move(clipStart, y0);
				clipPath.horizontal(x(lastTimepoint+1));
				clipPath.vertical(y1);
				clipPath.horizontal(clipStart);
				clipPath.vertical(y0);

				this._clipPaths[stream.streamId] = {
					id: stream.streamId,
					path: clipPath.get()
				}

                // find position to put a text label
				let textPos;
				if (Math.abs(y(stream.y1) - y(stream.y0)) < 25)
					textPos = -1;
				else {
					if (y(stream.y1) > y(stream.y0))
						textPos = y(stream.y0) + 15
					else
						textPos = y(stream.y1) + 15;
				}

                let streamObj = {
					path: d.get(),
                    depth: stream.depth,
                    deepestDepth: deepestDepth,
					id: stream.streamId,
					data: stream.data,
					textPos: { x: x(stream.x - 0.5*(1-this._proportion) + 0.5* stream.marginX),
										 y: textPos }
                };
                
                this._streams.push(streamObj);
                /*if (!this._streams[stream.depth])
                    this._streams[stream.depth] = [];
                this._streams[stream.depth].push(streamObj);
                */

			}

            // if stream IDs are strings, the clipPath array has an empty value in the beginning --> remove
            this._clipPaths = this._clipPaths.filter(d => d)

			// TODO: apply an order in which children are drawn correctly
            // this._streams.sort((a,b) => (a.depth < b.depth) ? -1 : 1)
            this._streams.sort((a,b) => (a.deepestDepth < b.deepestDepth) ? -1 : 1)
            //this._streams.sort((a,b) => a.id < b.id ? -1: 1)
            //this._streams.reverse();
		}
    }
    
	d3.SecStreamData = (...args) => new SecStreamData(...args);
}