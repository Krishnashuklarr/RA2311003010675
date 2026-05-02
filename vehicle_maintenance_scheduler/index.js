const axios = require("axios");
const getToken = require("./auth");
const Log = require("../logging_middleware/logger"); 

async function start() {
  try {
    const token = await getToken();
    console.log("Token ready\n");
    await getTopNotifications(token);

    const depotRes = await axios.get(
      "http://20.207.122.201/evaluation-service/depots",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const depots = depotRes.data.depots;
    console.log(" Depots:", depots, "\n");

    const vehicleRes = await axios.get(
      "http://20.207.122.201/evaluation-service/vehicles",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const vehicles = vehicleRes.data.vehicles;
    console.log(" Vehicles fetched:", vehicles.length, "\n");

    const mechanicHours = depots[0].MechanicHours;
    console.log("🛠 Available Hours:", mechanicHours, "\n");

    vehicles.sort((a, b) => {
      return (b.Impact / b.Duration) - (a.Impact / a.Duration);
    });

    let totalTime = 0;
    let totalImpact = 0;
    let selectedTasks = [];

    for (let task of vehicles) {
      if (totalTime + task.Duration <= mechanicHours) {
        totalTime += task.Duration;
        totalImpact += task.Impact;
        selectedTasks.push(task);
      }
    }

    console.log("Selected Tasks:", selectedTasks.length);
    console.log("Total Impact:", totalImpact);
    console.log("⏱ Total Time Used:", totalTime, "\n");

    await Log(
      "backend",
      "info",
      "service",
      `Selected ${selectedTasks.length} tasks with impact ${totalImpact}`,
      token
    );

    console.log("Logged successfully!");

  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

start();
async function getTopNotifications(token) {
  const axios = require("axios");

  try {
    const res = await axios.get(
      "http://20.207.122.201/evaluation-service/notifications",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const notifications = res.data.notifications;

    const priorityMap = {
      Placement: 3,
      Result: 2,
      Event: 1
    };

    const sorted = notifications.sort((a, b) => {
      if (priorityMap[b.Type] !== priorityMap[a.Type]) {
        return priorityMap[b.Type] - priorityMap[a.Type];
      }
      return new Date(b.Timestamp) - new Date(a.Timestamp);
    });

    const top10 = sorted.slice(0, 10);

    console.log("\n Top Notifications:");
    console.log(top10);

  } catch (err) {
    console.error(" Notification Error:", err.response?.data || err.message);
  }
}