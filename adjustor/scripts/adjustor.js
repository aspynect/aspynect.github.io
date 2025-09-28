async function adjustSplits(deltas, splits, fileName) {
    let segments = splits.querySelectorAll('Segment');
    let asymmetric = document.getElementById('asymmBox').checked;
    let totalAdjustment = 0

    segments.forEach((segment, index) => {
        let adjustment = deltas[index];
        totalAdjustment += adjustment;
        
        segment.querySelectorAll('SplitTime > RealTime, SplitTime > GameTime').forEach(timeElement => {
            let currentSeconds = timeToSeconds(timeElement.textContent);
            
            let newSeconds = asymmetric ? currentSeconds + totalAdjustment : currentSeconds + adjustment;
            timeElement.textContent = secondsToTimeXML(newSeconds);
        });

        if (deltas[index] === 0) return;
        
        segment.querySelectorAll('BestSegmentTime > RealTime, BestSegmentTime > GameTime').forEach(timeElement => {
            let currentSeconds = timeToSeconds(timeElement.textContent);
            let newSeconds = currentSeconds + adjustment;
            timeElement.textContent = secondsToTimeXML(newSeconds);
        });

        segment.querySelectorAll('SegmentHistory > Time > RealTime, SegmentHistory > Time > GameTime').forEach(timeElement => {
            let currentSeconds = timeToSeconds(timeElement.textContent);
            let newSeconds = currentSeconds + adjustment;
            timeElement.textContent = secondsToTimeXML(newSeconds);
        });
    });

    if (!asymmetric) {
        segments.forEach((segment, index) => {
            let adjustment = deltas[index];
            if (adjustment === 0 || index >= segments.length - 1) return;

            let nextSegment = segments[index + 1];

            nextSegment.querySelectorAll('BestSegmentTime > RealTime, BestSegmentTime > GameTime').forEach(timeElement => {
                let currentSeconds = timeToSeconds(timeElement.textContent);
                let newSeconds = currentSeconds - adjustment;
                timeElement.textContent = secondsToTimeXML(newSeconds);
            });

            nextSegment.querySelectorAll('SegmentHistory > Time > RealTime, SegmentHistory > Time > GameTime').forEach(timeElement => {
                let currentSeconds = timeToSeconds(timeElement.textContent);
                let newSeconds = currentSeconds - adjustment;
                timeElement.textContent = secondsToTimeXML(newSeconds);
            });
        });
    }

    let xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    let xmlString = xmlHeader + new XMLSerializer().serializeToString(splits.documentElement);

    let blob = new Blob([xmlString], { type: 'text/xml' });
    let url = URL.createObjectURL(blob);
    let downloader = document.createElement('a');
    downloader.classList.add('hidden');
    downloader.setAttribute('download', `${fileName}_adjusted.lss`);
    downloader.setAttribute('href', url);
    document.getElementById("display").appendChild(downloader);
    downloader.click();
    downloader.remove();
}

async function onDrop(ev) {
    ev.preventDefault();
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
    let splits = parser.parseFromString(fileText, 'application/xml');
    let splitCount = splits.querySelectorAll('Segment').length;

    let gameName = splits.querySelector('GameName').textContent
    let categoryName = splits.querySelector('CategoryName').textContent
    let variables = Array.from(splits.querySelectorAll('Variable'))
    let governmentName = `${gameName} ${categoryName} (${variables.join(', ')})`;

    let segmentsInfo = []
    let segments = splits.querySelectorAll('Segment');
    for (let segment of segments) {
        let segmentInfo = []
        segmentInfo.push(segment.querySelector('Name').textContent);
        segmentInfo.push(segment.querySelector('SplitTime').lastElementChild.textContent);
        segmentInfo.push(segment.querySelector('BestSegmentTime').lastElementChild.textContent);
        segmentsInfo.push(segmentInfo);
    }

    let table = document.createElement('table');
    table.style.borderSpacing = '10px';
    table.style.borderCollapse = 'separate';
    let tableHead = document.createElement('thead');
    let tableBody = document.createElement('tbody');

    let headerRow = document.createElement('tr');
    let headers = ['Name', 'PB', 'PB Segment', 'Best', 'Delta'];
    headers.forEach(headerText => {
        let th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);

    let previousPBSeconds = 0;
    segmentsInfo.forEach((row, index) => {
        let tr = document.createElement('tr');

        let nameCell = document.createElement('td');
        nameCell.textContent = row[0];
        tr.appendChild(nameCell);

        let pbCell = document.createElement('td');
        pbCell.textContent = secondsToTime(timeToSeconds(row[1]));
        tr.appendChild(pbCell);

        let pbSegmentCell = document.createElement('td');
        let currentPBSeconds = timeToSeconds(row[1]);
        let segmentSeconds = currentPBSeconds - previousPBSeconds;
        pbSegmentCell.textContent = secondsToTime(segmentSeconds);
        tr.appendChild(pbSegmentCell);
        previousPBSeconds = currentPBSeconds;

        let sobCell = document.createElement('td');
        sobCell.textContent = secondsToTime(timeToSeconds(row[2]));
        tr.appendChild(sobCell);

        let deltaCell = document.createElement('td');
        let deltaInput = document.createElement('input');
        deltaInput.type = 'number';
        deltaInput.step = '0.01';
        deltaInput.id = `delta-${index}`;
        deltaCell.appendChild(deltaInput);
        tr.appendChild(deltaCell);

        tableBody.appendChild(tr);
    });
    table.appendChild(tableHead);
    table.appendChild(tableBody);

    let asymmBox = document.createElement('input')
    asymmBox.type = 'checkbox';
    asymmBox.id = 'asymmBox';
    asymmBox.title = 'Adjust each split individually without applying the delta to the next split'
    let asymmLabel = document.createElement('label');
    asymmLabel.htmlFor = 'asymmBox';
    asymmLabel.textContent = 'Asymmetric mode';
    asymmLabel.title = asymmBox.title;

    let button = document.createElement('button');
    button.textContent = 'Adjust Splits';
    button.onclick = function() {
        let deltaValues = [];
        segmentsInfo.forEach((row, index) => {
            let deltaInput = document.getElementById(`delta-${index}`);
            let value = parseFloat(deltaInput.value) || 0;
            deltaValues.push(value);
        });
        adjustSplits(deltaValues, splits, fileName);
    };

    display.appendChild(table);
    display.appendChild(asymmBox);
    display.appendChild(asymmLabel);
    display.appendChild(document.createElement('br'));
    display.appendChild(button);
}

function timeToSeconds(timeString) {
    if (!timeString || !timeString.trim()) return 0;
    let parts = timeString.split(':').map(p => p.trim());
    let seconds = 0;

    if (parts.length === 3) {
        seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
        seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
        seconds = parseFloat(parts[0]);
    }
    return seconds;
}

function secondsToTime(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`;
    } else if (minutes > 0) {
        return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
    } else {
        return `${seconds.toFixed(2)}`;
    }
}

function filecheck(ev) {
    if (ev.dataTransfer.files.length == 0) return 0
    let fileName = ev.dataTransfer.files[0].name
    if (fileName.split(".").pop() !== "lss") return 0;
    return 1;
}

function secondsToTimeXML(totalSeconds) {
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toFixed(7).padStart(10, '0')}`;
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
