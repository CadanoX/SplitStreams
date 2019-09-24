export function loadJSON(file, callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType('application/json');
  xobj.open('GET', file, true); // Replace 'my_data' with the path to your file
  xobj.onreadystatechange = function() {
    if (xobj.readyState == 4 && xobj.status == '200') {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

export function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/* Modified from https://stackoverflow.com/questions/23218174/how-do-i-save-export-an-svg-file-after-creating-an-svg-with-d3-js-ie-safari-an */
export function saveSvg(svgEl, name) {
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  var svgData = svgEl.outerHTML;
  var preface = '<?xml version="1.0" standalone="no"?>\r\n';
  var svgBlob = new Blob([preface, svgData], {
    type: 'image/svg+xml;charset=utf-8'
  });
  var svgUrl = URL.createObjectURL(svgBlob);
  var downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = name + '.svg';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/* Modified from https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser */
export function saveJson(exportObj, exportName) {
  var dataStr =
    'data:text/json;charset=utf-8,' +
    encodeURIComponent(JSON.stringify(exportObj));
  var downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', exportName + '.json');
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function addLoadingSpinner(div) {
  if (!div) {
    console.log('addLoadingSpinner: div does not exist');
    return;
  }

  if (!div.classList.contains('loading')) {
    div.classList.add('loading');

    let loader = document.createElement('div');
    loader.classList = 'loader';
    loader.style.top = div.scrollTop + 'px'; // position it correctly on scrollable divs
    loader.onscroll = function(e) {
      e.preventDefault();
    };
    div.appendChild(loader);

    let spinner = document.createElement('div');
    spinner.classList = 'spinner';
    let size =
      0.3 *
      (loader.clientHeight > loader.clientWidth
        ? loader.clientWidth
        : loader.clientHeight);
    spinner.style.width = size + 'px';
    spinner.style.height = size + 'px';
    spinner.style.borderWidth = 0.1 * size + 'px';
    loader.appendChild(spinner);
  }
}

export function removeLoadingSpinner(div) {
  if (!div) return;

  let loader = div.querySelector('.loader');
  if (!!loader) {
    div.removeChild(loader);
    div.classList.remove('loading');
  }
}
