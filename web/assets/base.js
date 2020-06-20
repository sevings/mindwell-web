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

// workaround for a Chrome bug
// https://stackoverflow.com/questions/44245032/svg-symbols-not-loading-with-ajax-content-in-chrome#comment75501160_44245032
function fixSvgUse(elem) {
    elem.find("use").each((i, e) => e.replaceWith(e.cloneNode()))
}

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

$(function() {
    let width = Math.round($(window).width())
    let date = new Date()
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000)
    document.cookie = "vpw=" + width + ";expires=" + date.toUTCString() + ";path=/"
})

$("#login-scroll").click(function() {
    return $("#login-section").velocity("scroll", { duration: 1000, easing: "easeInOutSine" })
})

 $("#send-recover").click(function() {
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    var form = $("#recover-email")
    if(!form[0].reportValidity())
        return false

    btn.addClass("disabled")

    var status = $("#recover-status")
    
    form.ajaxSubmit({
        headers: {
            "X-Error-Type": "JSON",
        },
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

    var form = $("#reset-password")
    if(!form[0].reportValidity())
        return false
        
    btn.addClass("disabled")

    var status = $("#reset-status")
    
    form.ajaxSubmit({
        resetForm: true,
        headers: {
            "X-Error-Type": "JSON",
        },
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
    if($(this).prop("checked"))
        input.attr("type", "text")
    else
        input.attr("type", "password")
})

$(".register").click(function() {
    var btn = $(this)
    if(btn.hasClass("disabled"))
        return false;

    var form = btn.parents("form")
    if(!form[0].reportValidity())
        return false

    btn.addClass("disabled")

    form.ajaxSubmit({
        dataType: "json",
        headers: {
            "X-Error-Type": "JSON",
        },
        success: function(data) {
            window.location.pathname = data.path
        },
        error: showAjaxError,
        complete: function() {
            btn.removeClass("disabled")
        },
    })

    return false;
})
