const axios = require('axios');
const AWS = require('aws-sdk');

exports.handler = async (event) => {
    let username = event.queryStringParameters.username;
    const response = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
    const responseBody = JSON.stringify(response.data);
    const responseCode = 200;

    return {
        statusCode: responseCode,
        body: responseBody
    };
}
