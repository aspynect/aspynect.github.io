async function completruct(goal, segments) {
    let sob = 0
    for (let i = 0; i < segments.length; i++) {
        sob += segments[i][2]
    }

    let diff = goal - sob
    let compSegments = []
    segments.forEach((segment) => {
        let segmentProportion = segment[2] / sob
        let segmentDiff = diff * segmentProportion
        compSegments.push(segmentDiff + segment[2])
    })
    return compSegments
}

async function addComparison(event, segmentsInfo, comparisonType) {
    event.preventDefault()
    let formData = new FormData(event.target)
    let goal = timeToSeconds(formData.get("goal"))

    let segments = await completruct(goal, segmentsInfo, comparisonType)
    await addComparisonToSplits(segments, comparisonType)

    let tableRows = Array.from(document.querySelectorAll("tr"))
    let headerRow = tableRows.shift()

    let newHeaderCell = document.createElement("th")
    let newHeaderCell2 = document.createElement("th")
    newHeaderCell.textContent = `${secondsToTime(segments.reduce((acc, seg) => acc + (seg || 0), 0))} (split times)`
    newHeaderCell2.textContent = `${secondsToTime(segments.reduce((acc, seg) => acc + (seg || 0), 0))}`
    headerRow.appendChild(newHeaderCell)
    headerRow.appendChild(newHeaderCell2)


    let totalTime = 0;
    tableRows.forEach((row, index) => {
        let newCell = document.createElement("td");
        let newCell2 = document.createElement("td");

        totalTime += segments[index]
        newCell.textContent = secondsToTime(totalTime)
        newCell2.textContent = secondsToTime(segments[index])

        row.appendChild(newCell)
        row.appendChild(newCell2)
    })

    return segments
}

async function addComparisonToSplits(segments, comparisonType) {
    let totalSum = segments.reduce((acc, seg) => acc + seg, 0);
    let nameString = `${secondsToTime(totalSum)} (generated)`;
    let splitTimes = splits.querySelectorAll("SplitTimes");

    let splitTime = 0
    segments.forEach((segTime, i) => {
        splitTime += segTime;
        let splitTimeElement = splits.createElement("SplitTime");
        splitTimeElement.setAttribute("name", nameString);

        let timeElement = splits.createElement(`${comparisonType}`);
        timeElement.textContent = secondsToXMLTime(splitTime);

        splitTimeElement.appendChild(timeElement);
        splitTimes[i].appendChild(splitTimeElement);
    });
}



function downloadSplits(fileName) {
    let xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    let xmlString = xmlHeader + new XMLSerializer().serializeToString(splits.documentElement);

    let blob = new Blob([xmlString], { type: 'text/xml' });
    let url = URL.createObjectURL(blob);
    let downloader = document.createElement('a');
    downloader.classList.add('hidden');
    downloader.setAttribute('download', `${fileName}_updated.lss`);
    downloader.setAttribute('href', url);
    document.getElementById("display").appendChild(downloader);
    downloader.click();
    downloader.remove();
}

async function onDrop(ev) {
    ev.preventDefault();
    let comparisonType = document.querySelector('input[name="comparison-type"]:checked').value

    let file = ev.dataTransfer.files[0];
    let fileName = file.name.split('.').slice(0, -1).join('.');

    let display = document.getElementById("display");
    display.innerHTML = "";
    
    let ptag = document.getElementById("drop-zone-ptag");

    if (filecheck(ev) === 0) {
        ptag.innerHTML = "File failed, file is either empty or not a .lss file";
        return;
    }
    ptag.innerHTML = "Drop a splits file to adjust split points";


    let fileText = await file.text();
    let parser = new DOMParser();
    splits = parser.parseFromString(fileText, 'application/xml');
    let splitCount = splits.querySelectorAll('Segment').length;

    let gameName = splits.querySelector('GameName').textContent
    let categoryName = splits.querySelector('CategoryName').textContent
    let variables = Array.from(splits.querySelectorAll('Variable'))
    let governmentName = `${gameName} ${categoryName} (${variables.join(', ')})`;

    let segmentsInfo = [];
    let segments = splits.querySelectorAll('Segment');
    for (let segment of segments) {
        let segmentInfo = [];
        segmentInfo.push(segment.querySelector('Name').textContent);

        let pbTime = timeToSeconds(segment.querySelector('SplitTime').querySelector(comparisonType).textContent);
        let bestSegmentTime = timeToSeconds(segment.querySelector('BestSegmentTime').querySelector(comparisonType).textContent);

        segmentInfo.push(pbTime);
        segmentInfo.push(bestSegmentTime);

        segmentsInfo.push(segmentInfo);
    }


    let table = document.createElement('table')
    table.style.borderSpacing = '10px'
    table.style.borderCollapse = 'separate'
    let tableHead = document.createElement('thead')
    let tableBody = document.createElement('tbody')

    let headerRow = document.createElement('tr')
    let headers = ['Name', 'PB', 'PB Segment', 'Best']
    headers.forEach(headerText => {
        let th = document.createElement('th');
        th.textContent = headerText
        headerRow.appendChild(th)
    });
    tableHead.appendChild(headerRow)

    let previousPBSeconds = 0
    segmentsInfo.forEach((row, index) => {
        let tr = document.createElement('tr')

        let nameCell = document.createElement('td')
        nameCell.textContent = row[0]
        tr.appendChild(nameCell)

        let pbCell = document.createElement('td')
        pbCell.textContent = secondsToTime(row[1])
        tr.appendChild(pbCell)

        let pbSegmentCell = document.createElement('td');
        let segmentSeconds = row[1] - (index > 0 ? segmentsInfo[index-1][1] : 0)
        pbSegmentCell.textContent = secondsToTime(segmentSeconds)
        tr.appendChild(pbSegmentCell)

        let sobCell = document.createElement('td')
        sobCell.textContent = secondsToTime(row[2])
        tr.appendChild(sobCell)

        tableBody.appendChild(tr)
    })

    table.appendChild(tableHead)
    table.appendChild(tableBody)

    let form = document.createElement("form");

    let label = document.createElement("label");
    label.htmlFor = "goal";
    label.textContent = "Goal: ([hh]:[mm]:ss[.ms])";
    form.appendChild(label);

    let input = document.createElement("input");
    input.type = "text";
    input.id = "goal";
    input.name = "goal";
    form.appendChild(input);

    let formButton = document.createElement("button");
    formButton.type = "submit";
    formButton.textContent = "Generate Comparison";
    form.appendChild(formButton);

    // Event listener
    form.addEventListener("submit", async (event) => await addComparison(event, segmentsInfo, comparisonType));

    // Append form to document
    document.body.appendChild(form);


    let button = document.createElement('button');
    button.textContent = 'Download Splits';
    button.addEventListener('click', async (event) => await downloadSplits(fileName));

    display.appendChild(table);
    display.appendChild(form);
    display.appendChild(button);


}

function timeToSeconds(timeString) {
    if (!timeString || !timeString.trim()) return 0;
    const parts = timeString.split(':').map(p => parseFloat(p.trim()));

    if (parts.length === 3) {
        // hh:mm:ss
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // mm:ss
        return parts[0] * 60 + parts[1];
    } else {
        return parts[0]; // seconds only
    }
}


function secondsToTime(totalSeconds) {
    totalSeconds = Math.round(totalSeconds * 100) / 100;
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toFixed(2).padStart(5,'0')}`;
    } else {
        return `${minutes}:${seconds.toFixed(2).padStart(5,'0')}`;
    }
}




function filecheck(ev) {
    if (ev.dataTransfer.files.length == 0) return 0
    let fileName = ev.dataTransfer.files[0].name
    if (fileName.split(".").pop() !== "lss") return 0;
    return 1;
}

function secondsToXMLTime(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = (totalSeconds % 60).toFixed(7);

    return `${hours.toString().padStart(2,'0')}:${minutes.toString().padStart(2,'0')}:${seconds}`;
}


function parseTime(timeStr) {
  // [hh:][mm:]ss[.ms]
    let regex = /^(?:(\d+):)?(?:(\d+):)?(\d+)(?:\.(\d+))?$/;

    let match = timeStr.match(regex);
    if (!match) {
    throw new Error("Invalid time format: " + timeStr);
    }

    let [, hh, mm, ss, ms] = match;

    hh = hh ? parseInt(hh, 10) : 0;
    mm = mm ? parseInt(mm, 10) : 0;
    ss = ss ? parseInt(ss, 10) : 0;
    ms = ms ? parseFloat("0." + ms) : 0;

  return hh * 3600 + mm * 60 + ss + ms;
}

document.addEventListener('DOMContentLoaded', () => {
    function preventDefaults(ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }

    window.addEventListener("dragenter", preventDefaults);
    window.addEventListener("dragover", preventDefaults);
    window.addEventListener("drop", onDrop);
});
let splits