
function tab2json(tab) {
    var capturing = browser.tabs.captureTab(tab.id, {"format":"jpeg", "quality":50});
    capturing.then(function onPreview(preview) {
        generateJSON(tab, preview);
    }, function onError() {
        generateJSON(tab, false);
    });
}

function generateJSON(tab, preview) {
  var payload = JSON.stringify({"hostname": hostname(tab.url), "url":tab.url, "title":tab.title, "preview":preview, "date": new Date().toISOString()});
  var paylod_blob = new Blob([payload], {type: 'text/json'});
  var payload_url = URL.createObjectURL(paylod_blob);
  var payload_path = "tabs2json/" + getFilename(tab);
  var downloading = browser.downloads.download({
    url: payload_url,
    filename : payload_path,
    conflictAction: 'uniquify',
    saveAs: false,
  });
  var removing = browser.tabs.remove(tab.id);
}

function hostname(URL) {
    var newAnchor = document.createElement('a');
    newAnchor.href = URL;
    return newAnchor.hostname;
}

function getFilename(tab) {
    var filename = tab.title + '_' + hostname(tab.url);
    return filename.replace(/\s+/g, "_").replace(/[^\w.]/g, "").replace(/__+/g, "_") + '.json';
}

browser.browserAction.onClicked.addListener(tab2json);
