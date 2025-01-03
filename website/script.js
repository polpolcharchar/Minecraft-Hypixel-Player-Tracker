const targetData = [];

const apiKeys = [];

let keyIndex = 0;
let keyDelay;

function delay(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}
function submitApiKey(){
    let apiKey = document.getElementById("apiKeyInput").value;
    apiKeys.push(apiKey);

    initializeKeyDelay();

    document.getElementById("apiKeyInput").value = "";

    let h3 = document.createElement("h3");
    h3.innerHTML = apiKey;
    document.getElementById("apiKey").appendChild(h3);

    document.getElementById("table").hidden = false;
    document.getElementById("inputs").hidden = false;
}
async function getNextKey(){
    await delay(keyDelay);
    return apiKeys[keyIndex++ % apiKeys.length];
}
function initializeKeyDelay(){

    let requestsPer5Mins = apiKeys.length * 300.0;
    let requestsPerMin = requestsPer5Mins / 5;
    let requestsPerSecond = requestsPerMin / 60;

    let cooldownInSeconds = 1 / requestsPerSecond;
    let cooldownInMilliseconds = cooldownInSeconds * 1000;

    keyDelay = cooldownInMilliseconds;

    console.log("Key delay: " + keyDelay);
}

const baseURL = 'https://api.hypixel.net/v2/';

async function HYPIXEL_API_REQUEST(url){
    // console.log("API Request Made at: " + new Date().toLocaleTimeString());
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'API-Key': await getNextKey()
        }
    });
    const result = await response.json();
    return result;
}
async function getPlayerStatus(uuid){
    const apiUrl = `${baseURL}status?uuid=${uuid}`;
    const response = await HYPIXEL_API_REQUEST(apiUrl);
    return response;
}
async function getPlayerGames(uuid){
    const apiUrl = `${baseURL}recentgames?uuid=${uuid}`;
    const response = await HYPIXEL_API_REQUEST(apiUrl);
    return response;
}
async function getLastGame(uuid){
    return getPlayerGames(uuid).then(data => {
        // console.log(data);
        return data.games[0];
    });
}
async function getPlayerName(uuid){
    const apiUrl = `${baseURL}player?uuid=${uuid}`;
    const response = await HYPIXEL_API_REQUEST(apiUrl);
    return response.player.displayname;
}
async function getPlayerUUID(name){
    const apiURL = "https://hw5svqbvsa.execute-api.us-west-2.amazonaws.com/default/SnipeBotMojangApiOverride";
    const response = await fetch(apiURL, {
        method: 'POST',
        body: JSON.stringify({username: name}),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    const json = JSON.parse(data);

    return json.id;
}
async function getPlayer(name){
    let player = await HYPIXEL_API_REQUEST(`${baseURL}player?name=${name}`);
    console.log(player);
}






class TargetWrapper {
    constructor(name, uuid, map, isOnline, lastGame, isInGame, /*reason, */info, mode) {
        this.name = name;
        this.uuid = uuid;
        this.map = map;
        this.isOnline = isOnline;
        this.lastGame = lastGame;
        this.isInGame = isInGame;
        // this.reason = reason;
        this.info = info;
        this.mode = mode;
        this.active = false;  // Initialize the active state to false
    }
}

let targets = [];
let currentTargetIndex = 0;

let todo = [];

initialize();

async function initialize(){
    setInterval(checkUpdate, 100);
}
function initializeTable() {
    let tbody = document.getElementById('tbody');

    for (let i = 0; i < targets.length; i++) {
        let target = targets[i];
        let row = tbody.insertRow(i);

        let cells = getCellsForTarget(i);
        for (let j = 0; j < cells.length; j++) {
            let cell = row.insertCell(j);
            cell.innerHTML = cells[j];

            // If this is the name cell, add a click listener
            if (j === 0) {
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', function () {
                    // toggleActiveState(i);
                    todo.push(() => toggleActiveState(i));
                });
            }

            // if(j === cells.length - 1){
            //     addSnipeResultClickEffect(cell, target, "loss");
            // }else if(j === cells.length - 2){
            //     addSnipeResultClickEffect(cell, target, "troll");
            // }else if(j === cells.length - 3){
            //     addSnipeResultClickEffect(cell, target, "success");
            // }
        }

        // Set the initial color of the row based on the target's status
        updateRowColor(i, getRowColor(target));
    }
}
// function addSnipeResultClickEffect(cell, target, result){
    // cell.style.cursor = 'pointer';
    // cell.style.border = "2px solid red";
    // cell.addEventListener('click', function(){
    //     saveSnipe(target.name, result);
    //     playSound("snipe-sound");
    // });
// }


function getRowColor(target) {

    if(!target.isOnline || !target.active){
        return "#9a9a9a";
    }else if(target.isInGame){
        return "#a9fa8c";
    }else if(target.map != undefined){
        return "#faef8c";
    }

    return "#f4f4f4";
}
function getCellsForTarget(i){
    let target = targets[i];
    return [target.name, target.isInGame ? "Yes" : "No", target.mode == undefined ? "Offline" : target.mode, target.map, target.info];
}
async function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.play();
    }
}

function checkUpdate(){
    // console.log("checking");
    if(!updateOccuring){
        // console.log("valid check");
        update();
    }
}
let updateOccuring = false;
async function update() {



    updateOccuring = true;

    if (todo.length > 0) {
        // splices the first element of the array and calls it
        todo.splice(0, 1)[0]();

        updateOccuring = false;

        return;
    }

    if(targets.length == 0){
        updateOccuring = false;

        return;
    }

    let target = targets[currentTargetIndex];


    if(!target.isOnline || !target.active){

        currentTargetIndex++;
        if (currentTargetIndex >= targets.length) {
            currentTargetIndex = 0;
        }

        updateOccuring = false;

        return;
    }

    console.log("Updating target: " + target.name);

        
    let status = await getPlayerStatus(target.uuid);
    let session = status.session;

    if (!session.online) {
        target.isOnline = false;
        target.isInGame = false;
        target.map = undefined;
        target.mode = undefined;
        target.active = false;

        updateTableRow(currentTargetIndex);

        updateOccuring = false;

        return;
    }
    target.isOnline = true;

    let check = false;
    if (target.map == undefined && session.map != undefined) {
        check = true;
    } else if (target.map != undefined && target.map != session.map) {
        check = true;
    }

    let changeMade = false;

    if (target.map != session.map) {
        target.isInGame = false;
        target.map = session.map;
        target.mode = session.mode;

        changeMade = true;

        if(session.map != undefined){
            //this should be updated instantly because otherwise, there is a delay from the next await until the row is updated
            updateRowColor(currentTargetIndex, getRowColor(target));

            playSound("queue-sound");

            console.log("Queued for game: " + target.map);
        }
    }

    
    if (!changeMade && !target.isInGame && target.map != undefined) {
        let temp = await getLastGame(target.uuid);
        if (temp == undefined || target.lastGame == undefined || target.lastGame.map == undefined || !(temp.startDate == target.lastGame.startDate && temp.gameType == target.lastGame.gameType && temp.mode == target.lastGame.mode && temp.map == target.lastGame.map)) {
            target.isInGame = true;
            target.lastGame = temp;

            changeMade = true;


            playSound("start-sound");

            console.log("Started game: " + target.map);
        }
    } else if (!target.isInGame) {

    }

    if (changeMade) {
        updateTableRow(currentTargetIndex);
    }

    currentTargetIndex++;
    if (currentTargetIndex >= targets.length) {
        currentTargetIndex = 0;
    }

    updateOccuring = false;

    return;
}
function updateTableRow(i){
    let tbody = document.getElementById('tbody');
    let row = tbody.rows[i];

    let cells = getCellsForTarget(i);
    for (let i = 0; i < cells.length; i++) {
        row.cells[i].innerHTML = cells[i];
    }

    updateAllRowColors();
}
function updateAllRowColors() {
    for (let i = 0; i < targets.length; i++) {
        updateRowColor(i, getRowColor(targets[i]));
    }
}

function updateRowColor(rowIndex, color) {
    let tbody = document.getElementById('tbody');
    let row = tbody.rows[rowIndex];
    row.style.backgroundColor = color;
}
async function toggleActiveState(index) {
    console.log("Toggling active state for: " + targets[index].name);

    let target = targets[index];

    if(!target.isOnline){

        //check if this target is online or not:
        let status = await getPlayerStatus(target.uuid);
        let session = status.session;

        target.isOnline = session.online;

        if(target.isOnline){
            target.lastGame = await getLastGame(target.uuid);
        }
    }

    if(target.isOnline){
        
        target.active = !target.active;

    }



    

    updateTableRow(index);
    // updateTable();
}
async function addTarget(){
    //get the values from the input fields
    let name = document.getElementById("playerName").value;

    let unformattedUUID = await getPlayerUUID(name);
    let uuid = unformattedUUID.substring(0, 8) + "-" + unformattedUUID.substring(8, 12) + "-" + unformattedUUID.substring(12, 16) + "-" + unformattedUUID.substring(16, 20) + "-" + unformattedUUID.substring(20, 32);

    //validate uuid
    if(uuid.length != 36){
        console.log("Invalid UUID");
        return;
    }

    let info = document.getElementById("playerInfo").value;

    clearInputs();

    let lastGame = await getLastGame(uuid);
    if(lastGame == undefined){
        lastGame = {
            map: undefined,
            mode: undefined
        }
    }
    let status = await getPlayerStatus(uuid);
    let session = status.session;

    let gamesMatch = lastGame.map == session.map && lastGame.mode == session.mode;
    let inLobby = session.map == undefined;

    let temp = new TargetWrapper(name, uuid, session.map, session.online, lastGame, gamesMatch && !inLobby, info, session.mode);

    targets.push(temp);

    //remove all rows
    let tbody = document.getElementById('tbody');
    while(tbody.rows.length > 0){
        tbody.deleteRow(0);
    }

    initializeTable();

    todo.push(() => toggleActiveState(targets.length - 1));
}

function clearInputs(){
    document.getElementById("playerName").value = "";
    document.getElementById("playerInfo").value = "";
}