// Request notification permission on page load
if ('Notification' in window) {
    Notification.requestPermission().then(function(permission) {
        console.log('Notification permission:', permission);
    });
} else {
    console.log('This browser does not support notifications.');
}

// Function to send notification
function sendNotification() {
    if (Notification.permission === 'granted') {
        const notification = new Notification('Test Notification', {
            body: 'Hello! This is a test push notification.',
            icon: 'https://via.placeholder.com/64' // Optional icon
        });

        // Close notification after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);

        // Send POST request to backend with JSON payload
        fetch('http://localhost:8000/notify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Hello! This is a test push notification.' })
        })
        .then(response => response.json())
        .then(data => console.log('Backend response:', data))
        .catch(error => console.error('Error calling backend:', error));
    } else {
        alert(Notification.permission);
    }
}

// Add event listener to button
document.getElementById('notifyBtn').addEventListener('click', sendNotification);
