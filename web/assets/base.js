function logout() {
    document.cookie = 'api_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
}

function setOnline() {
    function sendRequest() {
        var req = new XMLHttpRequest()
        req.open('PUT', '/me/online', true)
        req.send()        
    }

    setInterval(sendRequest, 60000)

    sendRequest()
}

window.onload = setOnline
