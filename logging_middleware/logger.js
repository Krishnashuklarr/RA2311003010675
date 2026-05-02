const axios = require("axios");

async function Log(stack, level, package, message, token) {
  try {
    const res = await axios.post(
      "http://20.207.122.201/evaluation-service/logs",
      {
        stack: stack,
        level: level,
        package: package,  
        message: message
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("Log Success:", res.data);

  } catch (err) {
    console.error("Log Error:", err.response?.data || err.message);
  }
}

module.exports = Log;