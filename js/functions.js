function loadJSON(file, callback) {
	var xobj = new XMLHttpRequest();
	xobj.overrideMimeType("application/json");
	xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
	xobj.onreadystatechange = function () {
		if (xobj.readyState == 4 && xobj.status == "200") {
			// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
			callback(xobj.responseText);
		}
	};
	xobj.send(null);
}

function getRandomColor() {
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}
/* Modified from https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an */
function saveSvg(svgEl, name) {
    svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    var svgData = svgEl.outerHTML;
    var preface = '<?xml version="1.0" standalone="no"?>\r\n';
    var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
    var svgUrl = URL.createObjectURL(svgBlob);
    var downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name + ".svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

/* Modified from https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser */
function saveJson(exportObj, exportName){
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

function transformViscousFormat(data) {
    let format = d3.SecStreamInputData({forceFakeRoot: true});
    // add nodes
	for (let id in data.N) {
        let node = data.N[id];
        format.addNode(node.t, id, node.w)
    }
    // add tree structure
	for (let t in data.EN) {
        for (let id in data.EN[t]) {
            let childArray = data.EN[t][id];
            for (let childId of childArray) {
                format.addParent(t, childId, id);
            }
        }
    }
    // add timeline
	for (let stream in data.ET) {
		for (let nodeId in data.ET[stream]) {
			let t = data.N[nodeId].t;
			for (let nextId of data.ET[stream][nodeId]) {
                format.addNext(t, nodeId, nextId);
			}
		}
    }

    format.finalize();
    return format.data;
}

function transformGumtreeFormat(data)
{
	// we use references instead of hierarchical ids
	// timesteps holds for each timestime the corresponding tree
	// reference keeps for each node its pointers to all timesteps where it exists
	let format = {timesteps: []};
	let idx = 0;
	let currentTimestep,
		previousTimestep;

	/*let getUniqueID = (pointer) => {
		// initiate IDs
		if (timestep == 0)
			return idx++;

		if (data.changes.matches)
		;
		
		// look if this node has a matching node
		// if it has, use this nodes id, otherwise use new id
		// careful, because later nodes might refer to the data id, not ours
		if (!!format.reference[id][timestep])
		;
	};*/

	// Copy the trees for each timetep from input data to our data format
	let traverse = (src, dest) => {
		// we follow the  data's depth-first post-order traversal
		dest.children = [];
		if (!!src.children)
			for (let i = 0; i < src.children.length; i++) {
				//if (src.children[i].type != 162) { // remove comments
					dest.children[i] = { parent: dest };
					traverse(src.children[i], dest.children[i]);
				//}
			}

		dest.id = idx++;
		currentTimestep.references[dest.id] = dest;
		dest.size = src.length;
		dest.pos = src.pos;
		dest.data = {
			label: src.label,
			type: src.type,
			typeLabel: src.typeLabel,
			pos: src.pos,
			length: src.length
		}
	};

	

	for (t in data.timesteps)
	{
		idx = 0;
		currentTimestep = format.timesteps[t] = { deleted: {}, references: {}, tree: {} };
		traverse(data.timesteps[t].root, currentTimestep.tree);
		
		if (t != 0) {
			previousTimestep = format.timesteps[t-1];

			// Find matching nodes
			if (!!data.changes[t-1].matches)
				for (let match of data.changes[t-1].matches) {
					let prev = previousTimestep.references[match.src];
					currentTimestep.references[match.dest].prev = [ prev ];
					prev.next = [ currentTimestep.references[match.dest] ];
				}

			// find added, deleted nodes
			if (!!data.changes[t-1].actions)
				for (let action of data.changes[t-1].actions) {
					if (action.action == "delete")
						currentTimestep.deleted[action.tree] = previousTimestep.references[action.tree];
					
					/*if (action.action == "insert") {
						currentTimestep.references[action.tree].insertAt = action.at;
					}*/
				}
		}
	}

	return format;
}