const axios = require("axios");

async function getToken() {
  try {
    const res = await axios.post(
      "http://20.207.122.201/evaluation-service/auth",
      {
        email: "ks1214@srmist.edu.in",
        name: "Krishna Kumar Shukla",
        rollNo: "RA2311003010675",
        accessCode: "QkbpxH",
        clientID: "0603fc60-69b9-4742-9b82-9b2454bd8a03",
        clientSecret: "gvZqquyRXTwqqnaF",
      }
    );

    console.log("TOKEN:", res.data.access_token);
    return res.data.access_token;
  } catch (err) {
    console.error("Auth Error:", err.response?.data || err.message);
  }
}

module.exports = getToken;