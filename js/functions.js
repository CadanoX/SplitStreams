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
  var svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement("a");
  downloadLink.href = svgUrl;
  downloadLink.download = name + ".svg";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/* Modified from https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser */
function saveJson(exportObj, exportName) {
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function transformViscousFormat(data) {
  let format = d3.SecStreamInputData();
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

function transformGumtreeFormat(data) {
  let format = d3.SecStreamInputData();
  let idx = 0;

  // follow the data format's post-order DFS approach
  let traverse = (t, node) => {
    if (!!node.children)
      for (let i = 0; i < node.children.length; i++)
        traverse(t, node.children[i]);

    node.id = idx++;
    format.addNode(t, node.id, node.length, node.pos, {
      label: node.label,
      type: node.type,
      typeLabel: node.typeLabel
    });

    // children need to be added in a second step, becaues ID is not known beforehand
    if (!!node.children)
      for (let i = 0; i < node.children.length; i++)
        format.addParent(t, node.children[i].id, node.id);
  };

  for (t in data.timesteps) {
    idx = 0;
    // add nodes and tree structure
    traverse(t, data.timesteps[t].root);

    // add timeline (start with second, because data needs to be written before being modified)
    if (t > 0) {
      if (!!data.changes[t - 1].matches)
        for (let match of data.changes[t - 1].matches) {
          format.addNext(t - 1, match.src, match.dest);
        }

      // find added, deleted nodes
      // if (!!data.changes[t-1].actions)
      // 	for (let action of data.changes[t-1].actions) {
      // 		if (action.action == "delete")
      // 			currentTimestep.deleted[action.tree] = previousTimestep.references[action.tree];

      // 		/*if (action.action == "insert") {
      // 			currentTimestep.references[action.tree].insertAt = action.at;
      // 		}*/
      //     }
    }
  }

  format.finalize();
  return format.data;
}

function loadTitanFormat(data) {
  let format = d3.SecStreamInputData();
  let t = -1;
  let lastDate;
  for (let entry of data) {
    if (entry['observation_time'] != lastDate) {
      lastDate = entry['observation_time'];
      t++;
    }
    format.addNode(t, entry.id, +entry['cell_volume (km3)'])
  }

  t = -1;
  for (let entry of data) {
    if (entry['observation_time'] != lastDate) {
      lastDate = entry['observation_time'];
      t++;
    }
    let next = entry['IDs of children '].split(", ");
    if (next[0] != "")
      next.forEach((nextId) => format.addNext(t, entry.id, nextId));
  }

  format.finalize();
  return format.data;
}

function loadAllenFormat(data) {
  let format = d3.SecStreamInputData(/*{forceFakeRoot: true}*/);
  let timesteps = {
    "2": 0,
    "3": 1,
    "5": 2,
    "6": 3,
    "7": 4,
    "8": 5
  };
  let time = (t) => timesteps[t];

  for (let structureId in data) {
    let structure = data[structureId];
    for (let step in structure.timesteps) {
      let { id, timesteps, name, acronym, color, parent } = structure;
      format.addNode(time(step), id, timesteps[step], undefined, { name, acronym, color });
    }
  }

  for (let structureId in data) {
    let structure = data[structureId];
    for (let step in structure.timesteps) {
      let { id, timesteps, name, acronym, color, parent } = structure;
      format.addParent(time(step), id, parent);
    }
  }

  format._buildTimeConnections();
  format.finalize();
  return format.data;
}