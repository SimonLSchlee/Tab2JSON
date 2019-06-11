
function tab2json(tab) {
    var capturing = browser.tabs.captureTab(tab.id, {"format":"jpeg", "quality":50});
    return capturing.then(function onPreview(preview) {
        return generateJSON(tab, preview);
    }, function onError() {
        return generateJSON(tab, false);
    });
}

async function generateJSON(tab, preview) {
    var payload = JSON.stringify({
        "hostname": hostname(tab.url),
        "url":tab.url,
        "title":tab.title,
        "preview":preview,
        "date": new Date().toISOString()
    });
    var paylod_blob = new Blob([payload], {type: 'text/json'});
    var payload_url = URL.createObjectURL(paylod_blob);
    var payload_path = "tabs2json/" + getFilename(tab);
    await browser.downloads.download({
        url: payload_url,
        filename : payload_path,
        conflictAction: 'uniquify',
        saveAs: false,
    });
    await browser.tabs.remove(tab.id);
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

function first(x) {return x[0];}

async function currentTab() {
    return first(await browser.tabs.query({active: true}));
}

async function thistab() {
    return tab2json(await currentTab());
}

async function tabSelectDelta(delta) {
    let tab = await currentTab();
    let other = first(await browser.tabs.query({index:tab.index+delta}));
    if(other) {
        await browser.tabs.update(other.id, {active:true});
    }
}

async function nexttab() {
    await tabSelectDelta(1);
}

async function prevtab() {
    await tabSelectDelta(-1);
}

async function closetab() {
    let tab = await currentTab();
    await browser.tabs.remove(tab.id);
}

async function alltabs() {
    let not_pinned_tabs = await browser.tabs.query({pinned:false, currentWindow:true});
    for (let tab of not_pinned_tabs) {
        await tab2json(tab);
    }
}

browser.commands.onCommand.addListener(async (command) => {
    switch (command) {
    case "thistab":
        await thistab();
        break;
    case "nexttab":
        await nexttab();
        break;
    case "prevtab":
        await prevtab();
        break;
    case "closetab":
        await closetab();
        break;
    case "alltabs":
        await alltabs();
        break;
    }
});


