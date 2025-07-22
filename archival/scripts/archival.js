async function getCategories(abbreviation) {
    let response = await fetch(`https://www.speedrun.com/api/v1/games?abbreviation=${encodeURIComponent(abbreviation)}&embed=categories,levels,variables`).then(r => r.json());
    let data = response["data"][0];
    let output = {}
    output["id"] = data["id"];
    output["gameName"] = data["names"]["international"];
    output["categories"] = []
    for (let category of data["categories"]["data"]) {
        let categoryID = category["id"];
        let categoryName = category["name"];
        let categoryOutput = {
            "name": categoryName,
            "id": categoryID,
            "variables": []
        };

        for (let variable of data["variables"]["data"]) {
            if (variable["category"] == categoryID && variable["is-subcategory"] == true) {
                let variableName = variable["name"];
                let variableID = variable["id"];
                let optionIDs = Object.keys(variable["values"]["values"]);
                let options = []
                for (let option of optionIDs) {
                    options.push({
                        id: option,
                        name: variable["values"]["values"][option]["label"]
                    })
                }
                categoryOutput["variables"].push({
                    name: variableName,
                    id: variableID,
                    options: options
                })
            }
        }
        output["categories"].push(categoryOutput);
    }
    return output;
}


async function displayCategories(categories) {
    let gameDiv = document.getElementById("categories");
    gameDiv.innerHTML = "";

    let gameName = gameDiv.appendChild(document.createElement("h2"))
    gameName.innerText = categories["gameName"];
    gameName.dataset.id = categories["id"]

    let categoriesArray = categories["categories"];
    let categoriesDiv = gameDiv.appendChild(document.createElement("div"));
    for (let category of categoriesArray) {
        let categoryName = categoriesDiv.appendChild(document.createElement("h3"));
        categoryName.innerText = category["name"];
        categoryName.dataset.id = category["id"];
        categoryName.addEventListener("click", triggerArchive);

        let subcategoryArray = category["variables"];
        let subcategoriesDiv = categoriesDiv.appendChild(document.createElement("div"));
        for (let subcategory of subcategoryArray) {
            let subcategoryName = subcategoriesDiv.appendChild(document.createElement("h4"))
            subcategoryName.innerText = subcategory["name"];
            subcategoryName.dataset.id = subcategory["id"];
            
            let optionsArray = subcategory["options"];
            let optionDiv = subcategoriesDiv.appendChild(document.createElement("div"));
            for (let option of optionsArray) {
                let optionCheckbox = optionDiv.appendChild(document.createElement("input"));
                optionCheckbox.setAttribute("name", `subcategory-${subcategory["id"]}`);
                optionCheckbox.setAttribute("type", "checkbox");
                optionCheckbox.setAttribute("value", option["id"]);
                optionCheckbox.setAttribute("id", option["id"]);
                optionCheckbox.addEventListener("click", onlyOne);
                let optionLabel = optionDiv.appendChild(document.createElement("label"))
                optionLabel.innerText = option["name"];
                optionLabel.setAttribute("for", option["id"]);
            }
        }
    }
}


async function archiveCategory(gameID, categoryID, variables) {
    let url = `https://www.speedrun.com/api/v1/leaderboards/${gameID}/category/${categoryID}?embed=variables,players,platforms,category,game`;
    variables.map(variable => {
        let options = variable.options.map(option => `var-${encodeURIComponent(variable.id)}=${encodeURIComponent(option)}`).join("&");
        url += `&${options}`;
    })
    let response = await fetch(url).then(r => r.json());
    let data = response["data"];
    let entries = []

    let variableLabels = {};
    data["variables"]["data"].forEach(variable => {
        let values = variable["values"]["values"];
        variableLabels[variable["id"]] = {};
        for (let valueID in values) {
            let valueData = values[valueID];
            variableLabels[variable["id"]][valueID] = valueData["label"];
        }
    });
    
    let userMap = {};
    data["players"]["data"].forEach(player => {
        userMap[player["id"]] = player["names"]?.["international"] ?? player["name"];
    });
    
    let platformMap = {};
    data["platforms"]["data"].forEach(platform => {
        platformMap[platform["id"]] = platform["name"];
    });
    
    function formatTime(seconds) {
        let h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        let m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        let s = String(seconds % 60).padStart(2, '0');
        return h + ":" + m + ":" + s;
    }
    
    data["runs"].forEach(entry => {
        let run = entry["run"];
        let place = entry["place"];
        let playerID = run["players"][0]["id"];
        let playerName = userMap[playerID] || "Unknown";
        let video = (run["videos"] && run["videos"]["links"] && run["videos"]["links"][0])
            ? run["videos"]["links"][0]["uri"]
            : "N/A";
        let comment = run["comment"]
            ? run["comment"].replace(/\r/g, "").replace(/\n/g, "\\n")
            : "";
        let realtime = formatTime(run["times"]["realtime_t"]);
        let ingame = formatTime(run["times"]["ingame_t"]);
        let platformID = run["system"]["platform"];
        let platform = platformMap[platformID] || "Unknown";
    
        let variableValues = [];
        for (let varID in run["values"]) {
            let valueID = run["values"][varID];
            let label = (variableLabels[varID] && variableLabels[varID][valueID]) || valueID;
            variableValues.push(label);
        }
    
        let output = [
            escapeCSV(place),
            escapeCSV(playerName),
            ...variableValues.map(escapeCSV),
            escapeCSV(realtime),
            escapeCSV(ingame),
            escapeCSV(platform),
            escapeCSV(video),
            escapeCSV(comment)
        ].join(",");
        
    
        entries.push(output);
    });
    
    let csv = entries.join('\n');

    let blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    let downloadUrl = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${data["game"]["data"]["abbreviation"]}_${data["category"]["data"]["name"]}.csv`;
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


async function triggerArchive() {
    let gameID = this.parentElement.parentElement.querySelector("h2").dataset.id;
    let categoryID = this.dataset.id;
    let subcategoryDiv = this.nextElementSibling;
    let variables = [];
    for (let variable of subcategoryDiv.querySelectorAll("h4")) {
        let variableInfo = {
            id: variable.dataset.id,
            options: []
        }
        let optionDiv = variable.nextElementSibling;
        for (let option of optionDiv.querySelectorAll("input[type='checkbox']")) {
            if (option.checked) {
                variableInfo.options.push(option.value);
            }
        }
        if (variableInfo.options.length == 0) {
            continue;
        }
        variables.push(variableInfo);
    }
    archiveCategory(gameID, categoryID, variables);
}

function onlyOne() {
    var checkboxes = document.getElementsByName(this.name)
    checkboxes.forEach((item) => {
        if (item !== this) item.checked = false
    })
}

function escapeCSV(value) {
    if (value == null) return "";
    value = String(value);
    if (value.includes('"')) {
        value = value.replace(/"/g, '""'); // Escape double quotes
    }
    if (value.includes(",") || value.includes("\n")) {
        value = `"${value}"`; // Wrap in quotes if needed
    }
    return value;
}


const form = document.getElementById("leaderboard-form");
form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let categories = await getCategories(document.getElementById("abbreviation").value);
    await displayCategories(categories);
});