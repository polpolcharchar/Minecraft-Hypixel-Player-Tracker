async function scriptRequest(apiKey){
    const response = await fetch("https://nb44ve8wnj.execute-api.us-west-2.amazonaws.com/default/", {
        method: 'GET',
        headers: {
            'x-api-key': apiKey
        }
    });

    if(!response.ok){
        return false;
    }

    return await response.text();
}

submitPassword = async () => {
    let password = document.getElementById("password").value;
    let apiKey = password + "0".repeat(20 - password.length);

    //add the script
    let scriptText = await scriptRequest(apiKey);

    if(!scriptText){
        alert("Invalid password");
        return;
    }

    let script = document.createElement('script');
    script.innerHTML = scriptText;
    document.body.appendChild(script);

    //remove the password input
    document.getElementById("password").remove();
    document.getElementById("submit").remove();

    //show the table and inputs
    document.getElementById("apiKey").hidden = false;
}

