
function tab2json(tab) {
    let capturing = browser.tabs.captureTab(tab.id, {"format":"jpeg", "quality":50});
    return capturing.then(function onPreview(preview) {
        return generateJSON(tab, preview);
    }, function onError() {
        return generateJSON(tab, false);
    });
}

function asPNG(dataurl) {
    return new Promise((resolve, reject) => {
        let img    = document.createElement('img');
        img.addEventListener('load', () => {
            let canvas = document.createElement('canvas');
            canvas.width  = img.width;
            canvas.height = img.height;
            canvas.getContext('2d').drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        });
        img.src = dataurl;
    });
}

async function generateJSON(tab, preview) {
    let favicon = tab.favIconUrl? await asPNG(tab.favIconUrl) : false;
    let payload = JSON.stringify({
        "hostname": hostname(tab.url),
        "url":tab.url,
        "title":tab.title,
        "favicon":favicon,
        "preview":preview,
        "date": new Date().toISOString()
    });
    let payload_blob = new Blob([payload], {type: 'text/json'});
    let payload_url = URL.createObjectURL(payload_blob);
    let payload_path = "tabs2json/" + getFilename(tab);
    await browser.downloads.download({
        url: payload_url,
        filename : payload_path,
        conflictAction: 'uniquify',
        saveAs: false,
    });
    await browser.tabs.remove(tab.id);
}

function hostname(URL) {
    let newAnchor = document.createElement('a');
    newAnchor.href = URL;
    return newAnchor.hostname;
}

function getFilename(tab) {
    let filename = tab.title + '_' + hostname(tab.url);
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


