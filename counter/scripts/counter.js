async function onDrop(ev) {
    ev.preventDefault();
    let file = ev.dataTransfer.files[0];

    let display = document.getElementById("display");
    display.innerHTML = "";
    
    let ptag = document.getElementById("drop-zone-ptag");

    if (filecheck(ev) === 0) {
        ptag.innerHTML = "File failed, file is either empty or not a .lss file";
        return;
    }
    ptag.innerHTML = "Drop a splits file to count runs";


    let fileText = await file.text();
    let parser = new DOMParser();
    let splits = parser.parseFromString(fileText, 'application/xml');
    let splitCount = splits.querySelectorAll('Segment').length;

    let gameName = splits.querySelector('GameName').textContent
    let categoryName = splits.querySelector('CategoryName').textContent
    let variables = Array.from(splits.querySelectorAll('Variable'))
    let governmentName = `${gameName} ${categoryName} (${variables.join(', ')})`;

    let runs = []
    let attempts = splits.querySelectorAll('Attempt');

    for (let attempt of attempts) {
        let gameTime = attempt.querySelector('Gametime');
        let realTime = attempt.querySelector('RealTime');

        if (gameTime) {
            runs.push(gameTime.textContent.trim().split('.')[0]);
        } else if (realTime) {
            runs.push(realTime.textContent.trim().split('.')[0]);
        }
    };
    runs.sort()

    let by10s = groupByInterval(runs, 10);
    let byMin = groupByInterval(runs, 60);

    for (let interval of by10s) {
        let example = interval[0];
        let parts = example.split(":");

        let label = parts.length === 3 && parts[0] === "00"
            ? `${parts[1]}:${parts[2][0]}x - ${interval.length}`  // "27:1x"
            : `${parts[0]}:${parts[1][0]}x - ${interval.length}`; // fallback for non-00 hours

        let div = document.createElement("div");
        let heading = document.createElement("h2");
        let ptag = document.createElement("p");

        heading.innerHTML = label;

        let values = interval.map(time => time.startsWith("00:") ? time.slice(3) : time);
        ptag.innerHTML = values.join(", ");

        div.appendChild(heading);
        div.appendChild(ptag);
        display.appendChild(div);
    }

    display.appendChild(document.createElement("hr"));
    for (let interval of byMin) {
        let example = interval[0];
        let parts = example.split(":");

        // Remove "00:" if present, then drop seconds
        let label = parts.length === 3 && parts[0] === "00"
            ? `${parts[1]}:xx - ${interval.length}`
            : `${parts[0]}:${parts[1]}:xx - ${interval.length}`;

        let div = document.createElement("div");
        let heading = document.createElement("h2");
        let ptag = document.createElement("p");

        heading.innerHTML = label;

        let values = interval.map(time => time.startsWith("00:") ? time.slice(3) : time);
        ptag.innerHTML = values.join(", ");

        div.appendChild(heading);
        div.appendChild(ptag);
        display.appendChild(div);
    }


}

function groupByInterval(times, interval) {
    return Object.values(
        times.reduce((acc, t) => {
            let [h, m, s] = t.split(":").map(Number);
            let sec = h * 3600 + m * 60 + s;
            let key = Math.floor(sec / interval);
            (acc[key] ||= []).push(t);
            return acc;
    }, {})
    );
}

function filecheck(ev) {
    if (ev.dataTransfer.files.length == 0) return 0
    let fileName = ev.dataTransfer.files[0].name
    if (fileName.split(".").pop() !== "lss") return 0;
    return 1;
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
