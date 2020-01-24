
async function tab2json(tab, dont_close) {
    let preview = await tryGetPreview(tab.id);
    await generateJSON(tab, preview);
    if(!dont_close){
        await browser.tabs.remove(tab.id);
    }
}

function tryGetPreview(tabid) {
    let capturing = browser.tabs.captureTab(tabid, {"format":"jpeg", "quality":50});
    return capturing.then(function onPreview(preview) {
        return preview;
    }, function onError() {
        return false;
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

// based on: https://stackoverflow.com/a/17415677
function toTimezoneIsoString(date) {
    let tzo = -date.getTimezoneOffset();
    let dif = tzo >= 0 ? '+' : '-';
    let pad = function(num) {
        let norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };
    return date.toISOString().slice(0,23) +
        dif + pad(tzo / 60) +
        ':' + pad(tzo % 60);
}

async function generateJSON(tab, preview) {
    let favicon = tab.favIconUrl? await asPNG(tab.favIconUrl) : false;
    let payload = JSON.stringify({
        "hostname": hostname(tab.url),
        "url":tab.url,
        "title":tab.title,
        "favicon":favicon,
        "preview":preview,
        "date": toTimezoneIsoString(new Date)
    });
    let payload_blob = new Blob([payload], {type: 'text/json'});
    let payload_url = URL.createObjectURL(payload_blob);
    let payload_path = "tabs2json/" + getFilename(tab);
    let download_id = await browser.downloads.download({
        url: payload_url,
        filename : payload_path,
        conflictAction: 'uniquify',
        saveAs: false,
    });
    await browser.downloads.erase({id: download_id});
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

function first(x) {return x[0];}

async function currentTab() {
    return first(await browser.tabs.query({active: true}));
}

async function savetab() {
    return tab2json(await currentTab(), true);
}

async function thistab() {
    return tab2json(await currentTab());
}

browser.browserAction.onClicked.addListener(thistab);

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
    case "savetab":
        await savetab();
        break;
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


