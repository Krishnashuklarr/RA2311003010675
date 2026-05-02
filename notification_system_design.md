# Stage 1: API Design

## Overview

This system is built to manage student notifications. It mainly includes APIs for authentication and logging, and uses them to handle notification-related operations.

---

## 1. Authentication API

This API is used to generate an access token which is required for calling other APIs.

* Method: POST
* Endpoint: /auth

The response gives a JWT token which is used in headers for authorization.

---

## 2. Logging API

This API is used to store logs of different events happening in the system.

* Method: POST
* Endpoint: /logs

### Request fields:

* stack → backend or frontend
* level → info / error
* package → where the log is coming from
* message → actual message

This helps in debugging when something goes wrong.

---

## 3. Notification Handling

Notifications are fetched and processed using APIs.

Main tasks:

* Get notifications
* Filter unread ones
* Process them based on need

---

## 4. Tech Used

* Node.js
* Axios
* REST APIs
* JWT

---

# Stage 2: Database Design

## Choice of DB

I would use PostgreSQL because data is structured and we need proper relations between users and notifications.

---

## Tables

### Users

* id
* name
* email

### Notifications

* id
* user_id
* type
* message
* is_read
* created_at

---

## Problems when data grows

* Query becomes slow for unread notifications
* Sorting by time takes longer
* Too many reads on DB

---

## Solutions

### Indexing

Add index on user_id and is_read

### Pagination

Use LIMIT instead of fetching everything

### Caching

Use Redis for frequently accessed data

---

## Queries

Fetch unread:
SELECT * FROM notifications
WHERE user_id = 1042 AND is_read = false
ORDER BY created_at DESC;

Mark as read:
UPDATE notifications
SET is_read = true
WHERE id = 'notification_id';

Insert:
INSERT INTO notifications (id, user_id, type, message)
VALUES ('uuid', 1042, 'Placement', 'Company hired you');

---

# Stage 3: Optimization

## Is query correct?

Yes, it is correct logically, but not efficient for large data.

---

## Why slow?

* It may scan full table
* Sorting takes time
* SELECT * fetches unnecessary data

---

## Better query

SELECT id, message, created_at
FROM notifications
WHERE user_id = 1042 AND is_read = false
ORDER BY created_at DESC
LIMIT 50;

---

## Index

CREATE INDEX idx_notifications
ON notifications(user_id, is_read, created_at DESC);

---

## Index on every column?

No. It will slow down inserts and waste space.

---

## Placement query (last 7 days)

SELECT DISTINCT user_id
FROM notifications
WHERE type = 'Placement'
AND created_at >= NOW() - INTERVAL 7 DAY;


# Stage 4: Improving Notification Fetch Performance

## Problem

Right now, notifications are fetched from the database on every page load for every student.
This is causing high load on the database and slowing down the system.

---

## Solution

### 1. Caching (Best Improvement)

We can store recent notifications in Redis.

* When user opens the page → fetch from cache
* If not present → fetch from DB and store in cache

This reduces repeated DB hits.

---

### 2. Pagination

Instead of loading all notifications, fetch limited data:

Example:
LIMIT 20

This reduces query size and improves speed.

---

### 3. Lazy Loading

Load notifications only when user opens the notification section instead of on every page load.

---

### 4. Read Replicas

Use read replicas to handle read-heavy operations like fetching notifications.

---

## Trade-offs

* Cache may show slightly stale data
* Extra cost for Redis / infra
* More system complexity

---

## Conclusion

Using caching + pagination will significantly reduce DB load and improve user experience.

# Stage 5: Reliable Notification System Design

## Problems in Given Code

The current approach sends notifications in a loop:

* It is slow (sequential processing)
* If sending email fails for some users, there is no retry
* No tracking of failed notifications
* Not scalable for 50,000 users

---

## What happens if 200 emails fail?

Currently:

* Those users will not receive notifications
* No retry mechanism exists
* Data inconsistency happens

---

## Improved Design

We should use a queue-based system.

### Flow:

1. Store notification in DB first
2. Push job to queue (Kafka / RabbitMQ)
3. Workers process:

   * send email
   * send app notification

---

## Should DB save and email sending happen together?

No.

* Saving to DB should happen first (source of truth)
* Email sending should be async

---

## Retry Mechanism

If email fails:

* Retry 2–3 times
* Store failed jobs for later retry

---

## Improved Pseudocode

```
function notify_all(student_ids, message):

    for student_id in student_ids:
        save_to_db(student_id, message)

        push_to_queue({
            student_id,
            message
        })


worker():

    while true:
        job = get_from_queue()

        try:
            send_email(job.student_id, job.message)
            push_to_app(job.student_id, job.message)

        except:
            retry_job(job)
```

---

## Benefits

* Faster (parallel processing)
* Reliable (retry mechanism)
* Scalable for large users


# Stage 6: Priority Notification System

## Approach

Notifications are prioritized based on:

* Type weight:
  Placement > Result > Event
* Recency (latest gets higher priority)

---

## Code (Node.js)

```javascript
const axios = require("axios");

const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1
};

function getPriorityScore(notification) {
  const typeScore = TYPE_WEIGHT[notification.Type] || 0;

  const timeScore = new Date(notification.Timestamp).getTime();

  return typeScore * 1000000000000 + timeScore;
}

async function getTopNotifications(token) {
  const res = await axios.get(
    "http://20.207.122.201/evaluation-service/notifications",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  const notifications = res.data.notifications;

  // sort by priority
  notifications.sort((a, b) => {
    return getPriorityScore(b) - getPriorityScore(a);
  });

  // return top 10
  return notifications.slice(0, 10);
}

// run
async function main() {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJrczEyMTRAc3JtaXN0LmVkdS5pbiIsImV4cCI6MTc3NzcwMjEwNSwiaWF0IjoxNzc3NzAxMjA1LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNzNjODhhYjAtYWU1YS00Y2YzLWI0ZDYtNjc2MjRjMGEyYTMzIiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoia3Jpc2huYSBrdW1hciBzaHVrbGEiLCJzdWIiOiIwNjAzZmM2MC02OWI5LTQ3NDItOWI4Mi05YjI0NTRiZDhhMDMifSwiZW1haWwiOiJrczEyMTRAc3JtaXN0LmVkdS5pbiIsIm5hbWUiOiJrcmlzaG5hIGt1bWFyIHNodWtsYSIsInJvbGxObyI6InJhMjMxMTAwMzAxMDY3NSIsImFjY2Vzc0NvZGUiOiJRa2JweEgiLCJjbGllbnRJRCI6IjA2MDNmYzYwLTY5YjktNDc0Mi05YjgyLTliMjQ1NGJkOGEwMyIsImNsaWVudFNlY3JldCI6Imd2WnFxdXlSWFR3cXFuYUYifQ.rMb2EYUEw4UloV6UgFRvc5r1SrpzHLHD85p8B_ZM6GI";

  const top = await getTopNotifications(token);

  console.log("Top Notifications:");
  console.log(top);
}

main();
```

---

## How it works

* Assign weight to type
* Add timestamp importance
* Sort notifications
* Return top 10

---

## Handling continuous incoming data

* Use a min-heap of size 10
* Replace lowest priority when new notification comes

---

## Output

The system always shows most important notifications first.
