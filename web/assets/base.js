function formatDate(unix) {
    var today = new Date()
    var date = new Date(unix * 1000)
    
    function time() {
        var min = date.getMinutes()
        if(min < 10)
            min = "0" + min       
            
        return date.getHours() + ":" + min 
    }

    if(today.getDate() == date.getDate() 
        && today.getMonth() == date.getMonth() 
        && today.getFullYear() == date.getFullYear())
        return "Сегодня в " + time()

    var yesterday = today
    yesterday.setDate(today.getDate() - 1)

    if(yesterday.getDate() == date.getDate()
        && yesterday.getMonth() == date.getMonth() 
        && yesterday.getFullYear() == date.getFullYear())
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
        str += " сентября"
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
    $(elements).find(".showname").each(shuffleContent)
    return elements
}

formatTimeElements()

function showAjaxError(req) {
    var resp = JSON.parse(req.responseText)
    alert(resp.message)
}

// for counting new lines properly
$("textarea").each(function() {
    var area = $(this)
    var max = area.prop("maxlength")
    if(max <= 0)
        return;
        
    area.maxlength({
        max: max,
        showFeedback: false,
    })
})

function unescapeHtml(text) {
    return text
         .replace(/&amp;/g,  "&")
         .replace(/&lt;/g,   "<")
         .replace(/&gt;/g,   ">")
         .replace(/&quot;/g, '"')
         .replace(/&#34;/g,  '"')
         .replace(/&#039;/g, "'")
         .replace(/&#39;/g,  "'")
 }

 $("#send-recover").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#recover-status")
    
    $("#recover-email").ajaxSubmit({
        success: function() {
            status.text("Письмо отправлено. Проверь свой почтовый ящик.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            var msg = resp ? resp.message : ""
            status.text(msg)
            status.addClass("alert-danger").removeClass("alert-success")
            btn.removeClass("disabled")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})

$("#send-reset").click(function() { 
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;
        
    btn.addClass("disabled")

    var status = $("#reset-status")
    
    $("#reset-password").ajaxSubmit({
        resetForm: true,
        success: function() {
            status.text("Теперь ты можешь войти в свой аккаунт, используя новый пароль.")
            status.removeClass("alert-danger").addClass("alert-success")
        },
        error: function(req) {
            var resp = JSON.parse(req.responseText)
            var msg = resp ? resp.message : ""
            status.text(msg)
            status.addClass("alert-danger").removeClass("alert-success")
            btn.removeClass("disabled")
        },
        complete: function() {
            status.toggleClass("alert", true)
        },
    })

    return false;
})

window.addEventListener('touchstart', function onFirstTouch() {
    window.isTouchScreen = true;
    window.removeEventListener('touchstart', onFirstTouch, false);
}, false);

$(".show-password").click(function() {
    var input = $(this).parents("form").find("input[name='password']")
    if(input.attr("type") == "password")
        input.attr("type", "text")
    else
        input.attr("type", "password")
})
