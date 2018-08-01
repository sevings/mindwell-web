function setOnline() {
    function sendRequest() {
        $.ajax({
            url: "/me/online",
            method: "PUT"
        })    
    }

    setInterval(sendRequest, 180000)

    sendRequest()
}

$(setOnline)

function formatDate(unix) {
    var today = new Date()
    var date = new Date(unix * 1000)
    
    function time() {
        var min = date.getMinutes()
        if(min < 10)
            min = "0" + min       
            
        return date.getHours() + ":" + min 
    }

    if(today.getDate() == date.getDate())
        return "Сегодня в " + time()

    var yesterday = today
    yesterday.setDate(today.getDate() - 1)

    if(yesterday.getDate() == date.getDate())
        return "Вчера в " + time()

    var str = date.getDate()

    switch (date.getMonth()) {
    case 0:
        str += " января"
        break
    case 1:
        str += " февраля"
        break
    case 2:
        str += " марта"
        break
    case 3:
        str += " апреля"
        break
    case 4:
        str += " мая"
        break
    case 5:
        str += " июня"
        break
    case 6:
        str += " июля"
        break
    case 7:
        str += " августа"
        break
    case 8:
        str += " сентябя"
        break
    case 9:
        str += " октября"
        break
    case 10:
        str += " ноября"
        break
    case 11:
        str += " декабря"
        break
    default:
        str += " " + date.getMonth()
        break
    }

    if (today.getFullYear() !== date.getFullYear())
        str += " " + date.getFullYear()

    return str
}

function formatTimeElements(context) {
    $("time", context).each(function() {
        var unix = $(this).attr("datetime")
        var text = formatDate(unix)
        var title = new Date(unix * 1000).toLocaleString()
        $(this).text(text).attr("title", title)
    })    
}

function formatTimeHtml(html) {
    var template = document.createElement('template')
    template.innerHTML = html
    var elements = template.content.childNodes
    formatTimeElements(elements)
    return elements
}

$(formatTimeElements)
