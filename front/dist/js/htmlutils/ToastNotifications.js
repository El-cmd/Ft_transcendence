const toastQueue = [];
let isToastShowing = false;

export function showToast(message, type = "primary", duration = 2000) {
    toastQueue.push({ message, type, duration }); // Add to queue
    processToastQueue(); // Attempt to show the next toast
}

function processToastQueue() {
    if (isToastShowing || toastQueue.length === 0) return;

    isToastShowing = true; // Prevent multiple toasts from appearing
    const { message, type, duration } = toastQueue.shift(); // Get the next toast

    // Set the message and background color
    const toastBody = document.getElementById("toastBody");
    const toastElement = document.getElementById("toast");
    toastBody.innerHTML = message;
    toastElement.className = `toast align-items-center text-white bg-${type} border-0`;

    // Show the toast
    const toast = new bootstrap.Toast(toastElement, { delay: duration });
    toast.show();

    // Wait for the toast to close before showing the next one
    toastElement.addEventListener("hidden.bs.toast", () => {
        isToastShowing = false; // Allow the next toast
        processToastQueue(); // Show the next toast if available
    }, { once: true });
}