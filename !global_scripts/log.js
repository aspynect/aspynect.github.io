//encodeURIComponent()



//game, category, split count, timing methods
function splitsLog(game, category, splitCount, timing) {
    if (timing[0] && timing[1]) {
        fetch (`https://aspyn.gay/api/splits?g=${encodeURIComponent(game)}&c=${encodeURIComponent(category)}&s=${encodeURIComponent(splitCount)}&t=${encodeURIComponent("RTA, IGT")}`)
    } else if (timing[0]) {
        fetch (`https://aspyn.gay/api/splits?g=${encodeURIComponent(game)}&c=${encodeURIComponent(category)}&s=${encodeURIComponent(splitCount)}&t=${encodeURIComponent("RTA")}`)
    } else {
        fetch (`https://aspyn.gay/api/splits?g=${encodeURIComponent(game)}&c=${encodeURIComponent(category)}&s=${encodeURIComponent(splitCount)}&t=${encodeURIComponent("IGT")}`)
    }
}

//generation methods used
function compGenLog(method) {
    fetch (`https://aspyn.gay/api/compconstruct?m=${method}`)
}

//number of comparisons
function compDownloadLog(count) {
    fetch (`https://aspyn.gay/api/compdownload?c=${count}`)
}

//which file was downloaded
function coreDownloadLog() {
    fetch (`https://aspyn.gay/api/moddownload?f=LiveSplitCore`)
}
function timerDownloadLog() {
    fetch (`https://aspyn.gay/api/moddownload?f=LiveSplitTimer`)
}